/**
 * Add Modal Module
 * Creates and manages the add row modal dialog
 */

class AddModal {
    constructor(tableInstance) {
        this.table = tableInstance;
        this.modal = null;
        this.fields = [];
        this.lookupData = {}; // Cache for combobox lookup data
        this.editMode = false;
        this.editRowData = null;
        this.editRowIndex = null;
    }

    async show(editRowData = null, editRowIndex = null) {
        // Set edit mode if row data is provided
        this.editMode = editRowData !== null;
        this.editRowData = editRowData;
        this.editRowIndex = editRowIndex;
        try {
            // Get form name from table options or storage key
            const formName = this.getFormName();
            if (!formName) {
                alert('Form name not found. Cannot show add modal.');
                return;
            }

            // Fetch field configurations
            const response = await fetch(`./backend/table-data.php?action=getFields&formName=${encodeURIComponent(formName)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message);
            }

            this.fields = result.fields;
            this.tableName = result.table_name;

            // Create and show modal
            this.createModal();
            this.showModal();
        } catch (error) {
            console.error('Error showing add modal:', error);
            alert('Failed to load form fields: ' + error.message);
        }
    }

    getFormName() {
        // Try to extract form name from storage key or options
        const storageKey = this.table.options.storageKey || '';
        const match = storageKey.match(/table_\w+_(\w+)/);
        if (match) {
            return match[1];
        }
        // Fallback: try to get from table container data attribute
        const formName = this.table.container.getAttribute('data-form-name');
        return formName || null;
    }

    setFormName(formName) {
        // Store form name in table container for later retrieval
        this.table.container.setAttribute('data-form-name', formName);
    }

    createModal() {
        // Create modal HTML
        const modalLabel = this.editMode ? 'Edit Row' : 'Add New Row';
        const modalId = this.editMode ? 'edit-row-modal' : 'add-row-modal';
        const formId = this.editMode ? 'edit-row-form' : 'add-row-form';
        
        // Remove existing modal if any
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        let modalHTML = `
            <smart-window id="${modalId}" label="${modalLabel}" modal="true" resizable="false" 
                         style="width: 600px; max-width: 90vw; height: auto; max-height: 90vh;">
                <div class="add-modal-content" style="overflow-y: auto; max-height: calc(90vh - 100px);">
                    <form id="${formId}" class="add-row-form">
        `;

        // Generate form fields based on field configurations using Smart UI components
        // Fields are already filtered to only include those with non-empty labels
        this.fields.forEach(field => {
            // Get existing value if in edit mode
            let existingValue = '';
            if (this.editMode && this.editRowData) {
                existingValue = this.editRowData[field.field_name] || '';
                // For combobox fields, we need to get the name from the lookup table
                if (field.field_type === 'combobox' && existingValue) {
                    // existingValue is likely an ID, we'll need to fetch the name
                    // For now, we'll handle this in initializeComboboxes
                }
            }
            
            modalHTML += `
                <div class="smart-form-row">
                    <label>${this.escapeHtml(field.field_label)}</label>
            `;

            switch (field.field_type) {
                case 'text':
                    modalHTML += `
                        <smart-input
                            data-field="${field.field_name}"
                            placeholder="Enter ${field.field_label.toLowerCase()}"
                            class="underlined"
                            form-control-name="${field.field_name}"
                            value="${this.escapeHtml(existingValue)}"
                            required
                        ></smart-input>
                    `;
                    break;

                case 'number':
                    modalHTML += `
                        <smart-input
                            data-field="${field.field_name}"
                            placeholder="Enter ${field.field_label.toLowerCase()}"
                            class="underlined"
                            form-control-name="${field.field_name}"
                            type="number"
                            value="${this.escapeHtml(existingValue)}"
                            required
                        ></smart-input>
                    `;
                    break;

                case 'date':
                    modalHTML += `
                        <smart-date-input
                            data-field="${field.field_name}"
                            placeholder="Select ${field.field_label.toLowerCase()}"
                            class="underlined"
                            form-control-name="${field.field_name}"
                            value="${this.escapeHtml(existingValue)}"
                            required
                        ></smart-date-input>
                    `;
                    break;

                case 'combobox':
                    modalHTML += `
                        <smart-drop-down-list
                            data-field="${field.field_name}"
                            placeholder="Select ${field.field_label.toLowerCase()}"
                            class="underlined"
                            form-control-name="${field.field_name}"
                            selection-mode="one"
                            id="combobox-${field.field_name}"
                            required
                        ></smart-drop-down-list>
                    `;
                    break;

                case 'file':
                    modalHTML += `
                        <smart-file-upload
                            data-field="${field.field_name}"
                            class="underlined"
                            form-control-name="${field.field_name}"
                            id="file-${field.field_name}"
                            required
                        ></smart-file-upload>
                    `;
                    break;

                default:
                    modalHTML += `
                        <smart-input
                            data-field="${field.field_name}"
                            placeholder="Enter ${field.field_label.toLowerCase()}"
                            class="underlined"
                            form-control-name="${field.field_name}"
                            required
                        ></smart-input>
                    `;
            }

            modalHTML += `
                </div>`;
        });

        modalHTML += `
                    </form>
                </div>
                <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px;">
                    <smart-button id="${this.editMode ? 'edit' : 'add'}-modal-cancel">Cancel</smart-button>
                    <smart-button id="${this.editMode ? 'edit' : 'add'}-modal-submit" class="primary">${this.editMode ? 'Update' : 'Add'}</smart-button>
                </div>
            </smart-window>
        `;

        // Append to body
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        document.body.appendChild(tempDiv.firstElementChild);

        this.modal = document.getElementById(modalId);
        
        // Wait for Smart UI to upgrade elements, then initialize
        setTimeout(() => {
            this.initializeComboboxes();
            this.attachEventListeners();
        }, 100);
    }

    async initializeComboboxes() {
        // Find combobox fields (smart-drop-down-list)
        const comboboxFields = this.fields.filter(f => f.field_type === 'combobox');
        
        for (const field of comboboxFields) {
            const combobox = this.modal.querySelector(`#combobox-${field.field_name}`);
            if (!combobox) continue;

            // Load lookup data from job table
            await this.loadComboboxData(field.field_name, combobox);
            
            // If in edit mode, set the selected value
            if (this.editMode && this.editRowData && this.editRowData[field.field_name]) {
                // The value in editRowData is likely an ID, we need to get the name
                const fieldValue = this.editRowData[field.field_name];
                if (fieldValue) {
                    // Fetch the name for this ID
                    try {
                        const response = await fetch('./backend/table-data.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'getLookupData',
                                tableName: field.field_name,
                                columnName: 'name',
                                id: fieldValue
                            })
                        });
                        const result = await response.json();
                        if (result.status === 'success' && result.data && result.data.length > 0) {
                            // Set selected value
                            combobox.selectedValues = [result.data[0]];
                        }
                    } catch (error) {
                        console.error('Error loading combobox value for edit:', error);
                    }
                }
            }
        }
    }

    async loadComboboxData(fieldName, comboboxElement) {
        try {
            // For job field, get data from job table
            if (fieldName === 'job') {
                const response = await fetch('./backend/table-data.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'getLookupData',
                        tableName: 'job',
                        columnName: 'name'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (result.status === 'success' && result.data) {
                    // Set data source for smart-drop-down-list
                    const dataSource = result.data.map(name => ({ label: name, value: name }));
                    comboboxElement.dataSource = dataSource;
                }
            }
        } catch (error) {
            console.error('Error loading combobox data:', error);
            comboboxElement.dataSource = [];
        }
    }

    attachComboboxListeners(input) {
        // Find dropdown - it's a sibling in the combobox-wrapper
        const wrapper = input.closest('.combobox-wrapper');
        const dropdown = wrapper ? wrapper.querySelector('.combobox-dropdown') : document.getElementById(`dropdown-${input.name}`);
        
        if (!dropdown) {
            console.error('Dropdown not found for input:', input.name, 'Wrapper:', wrapper);
            return;
        }
        
        // Ensure dropdown is initially hidden
        dropdown.style.display = 'none';
        
        let filteredValues = input.lookupValues || [];
        let selectedIndex = -1;

        // Function to show dropdown with all values
        const showDropdown = () => {
            if (!dropdown) {
                console.error('Dropdown element is null');
                return;
            }
            
            // Always show dropdown if lookup values exist
            if (input.lookupValues && input.lookupValues.length > 0) {
                filteredValues = [...input.lookupValues].sort((a, b) => {
                    const searchValue = input.value.toLowerCase();
                    if (!searchValue) {
                        return a.localeCompare(b);
                    }
                    const aLower = a.toLowerCase();
                    const bLower = b.toLowerCase();
                    const aIndex = aLower.indexOf(searchValue);
                    const bIndex = bLower.indexOf(searchValue);
                    if (aIndex >= 0 && bIndex < 0) return -1;
                    if (aIndex < 0 && bIndex >= 0) return 1;
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    return a.localeCompare(b);
                });
                this.updateComboboxDropdown(dropdown, filteredValues, input.value.toLowerCase());
            } else if (input.lookupValues && input.lookupValues.length === 0) {
                // Show "No options" message
                dropdown.innerHTML = '<div class="dropdown-item">No options found</div>';
                dropdown.style.display = 'block';
                this.positionDropdown(dropdown);
            } else {
                // If lookup values haven't loaded yet, show empty dropdown
                dropdown.innerHTML = '<div class="dropdown-item">Loading...</div>';
                dropdown.style.display = 'block';
                this.positionDropdown(dropdown);
            }
        };

        input.addEventListener('input', (e) => {
            const searchValue = e.target.value.toLowerCase();
            
            if (input.lookupValues) {
                // Show all values, just sort by match position
                filteredValues = [...input.lookupValues].sort((a, b) => {
                    const aLower = a.toLowerCase();
                    const bLower = b.toLowerCase();
                    const aIndex = aLower.indexOf(searchValue);
                    const bIndex = bLower.indexOf(searchValue);
                    
                    // If search is empty, sort alphabetically
                    if (!searchValue) {
                        return a.localeCompare(b);
                    }
                    
                    // If one matches and the other doesn't, matched one comes first
                    if (aIndex >= 0 && bIndex < 0) return -1;
                    if (aIndex < 0 && bIndex >= 0) return 1;
                    
                    // Both match or both don't match - sort by position, then alphabetically
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    return a.localeCompare(b);
                });
            }
            
            this.updateComboboxDropdown(dropdown, filteredValues, searchValue);
            selectedIndex = -1;
        });

        // Show dropdown on focus
        input.addEventListener('focus', (e) => {
            e.stopPropagation();
            showDropdown();
        });
        
        // Show dropdown on click - use mousedown to ensure it fires before blur
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            // Prevent blur from firing immediately
            e.preventDefault();
            // Focus the input first
            input.focus();
            // Small delay to ensure dropdown shows after focus
            setTimeout(() => {
                showDropdown();
            }, 10);
        });
        
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            // Ensure dropdown is shown
            if (dropdown.style.display === 'none' || !dropdown.style.display) {
                showDropdown();
            }
        });

        input.addEventListener('blur', (e) => {
            // Delay to allow click on dropdown item
            setTimeout(() => {
                // Only hide if focus didn't move to dropdown or another input
                const activeElement = document.activeElement;
                if (!dropdown.contains(activeElement) && activeElement !== input) {
                    dropdown.style.display = 'none';
                }
            }, 200);
        });
        
        // Keep dropdown open when clicking on it
        dropdown.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Prevent input from losing focus
            input.focus();
        });
        
        // Also handle click on dropdown to prevent it from closing
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filteredValues.length - 1);
                this.highlightDropdownItem(dropdown, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                this.highlightDropdownItem(dropdown, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                input.value = filteredValues[selectedIndex];
                dropdown.style.display = 'none';
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
    }

    updateComboboxDropdown(dropdown, values, searchValue) {
        if (!dropdown) {
            console.error('Dropdown element not found');
            return;
        }
        
        if (values.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item">No options found</div>';
            dropdown.style.display = 'block';
            this.positionDropdown(dropdown);
            return;
        }

        let html = '';
        values.forEach((value, index) => {
            const highlighted = this.highlightMatch(value, searchValue);
            html += `<div class="dropdown-item" data-index="${index}" data-value="${this.escapeHtml(value)}">${highlighted}</div>`;
        });
        
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
        this.positionDropdown(dropdown);

        // Attach click listeners
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                // Find the input element (it's the sibling in the combobox-wrapper)
                const wrapper = dropdown.closest('.combobox-wrapper');
                const input = wrapper ? wrapper.querySelector('.combobox-input') : dropdown.previousElementSibling;
                if (input) {
                    input.value = item.getAttribute('data-value');
                    dropdown.style.display = 'none';
                    input.focus();
                    // Trigger input event to update filtered values
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        });
    }

    positionDropdown(dropdown) {
        if (!dropdown) return;
        
        // With position: absolute and top: 100%, the dropdown will automatically
        // position below the input relative to the combobox-wrapper.
        // We just need to check if it goes off-screen and adjust if necessary.
        
        const wrapper = dropdown.closest('.combobox-wrapper');
        if (!wrapper) return;
        
        // Get positions relative to viewport
        const wrapperRect = wrapper.getBoundingClientRect();
        const dropdownHeight = 200; // max-height from CSS
        const viewportHeight = window.innerHeight;
        
        // Check if dropdown would go off-screen below
        if (wrapperRect.bottom + dropdownHeight > viewportHeight) {
            // Position above the input instead
            dropdown.style.top = 'auto';
            dropdown.style.bottom = '100%';
            dropdown.style.marginTop = '0';
            dropdown.style.marginBottom = '2px';
        } else {
            // Position below the input (default CSS behavior)
            dropdown.style.top = '100%';
            dropdown.style.bottom = 'auto';
            dropdown.style.marginTop = '2px';
            dropdown.style.marginBottom = '0';
        }
        
        // Width is already 100% in CSS, so it will match the wrapper width
        // No need to set it manually
    }

    highlightMatch(text, search) {
        if (!search) return this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(search)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    highlightDropdownItem(dropdown, index) {
        const items = dropdown.querySelectorAll('.dropdown-item');
        items.forEach((item, i) => {
            item.classList.toggle('highlighted', i === index);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    attachEventListeners() {
        const formId = this.editMode ? 'edit-row-form' : 'add-row-form';
        const cancelBtnId = this.editMode ? 'edit-modal-cancel' : 'add-modal-cancel';
        const submitBtnId = this.editMode ? 'edit-modal-submit' : 'add-modal-submit';
        
        const form = this.modal.querySelector(`#${formId}`);
        const cancelBtn = this.modal.querySelector(`#${cancelBtnId}`);
        const submitBtn = this.modal.querySelector(`#${submitBtnId}`);

        cancelBtn.addEventListener('click', () => {
            this.hide();
        });

        submitBtn.addEventListener('click', () => {
            this.handleSubmit();
        });

        // Close on Escape key
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    async handleSubmit() {
        const formId = this.editMode ? 'edit-row-form' : 'add-row-form';
        const form = this.modal.querySelector(`#${formId}`);
        
        // Validate required fields before submission
        const inputs = form.querySelectorAll('[data-field]');
        const errors = [];
        
        inputs.forEach(input => {
            const key = input.getAttribute('data-field');
            const isRequired = input.hasAttribute('required');
            
            if (isRequired) {
                let value = '';
                let isEmpty = false;
                
                // Handle different Smart UI component types
                if (input.tagName === 'SMART-DROP-DOWN-LIST') {
                    value = input.selectedValues && input.selectedValues.length > 0 
                        ? input.selectedValues[0] 
                        : (input.value || '');
                    isEmpty = !value || String(value).trim() === '';
                } else if (input.tagName === 'SMART-DATE-INPUT') {
                    value = input.value || '';
                    isEmpty = !value || String(value).trim() === '';
                } else if (input.tagName === 'SMART-FILE-UPLOAD') {
                    isEmpty = !input.files || input.files.length === 0;
                } else {
                    // smart-input and others
                    value = input.value || '';
                    isEmpty = !value || String(value).trim() === '';
                }
                
                if (isEmpty) {
                    // Find the field label for error message
                    const field = this.fields.find(f => f.field_name === key);
                    const fieldLabel = field ? field.field_label : key;
                    errors.push(fieldLabel);
                    
                    // Add visual error indicator
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            }
        });
        
        // If there are validation errors, show them and prevent submission
        if (errors.length > 0) {
            alert('Please fill in all required fields: ' + errors.join(', '));
            return;
        }
        
        // Extract all fields that contain "data-field" attribute (like register page)
        const rowData = {};
        const fileFields = {};

        // Build payload object from input fields
        inputs.forEach(input => {
            const key = input.getAttribute('data-field');
            let value = '';
            
            // Handle different Smart UI component types
            if (input.tagName === 'SMART-DROP-DOWN-LIST') {
                value = input.selectedValues && input.selectedValues.length > 0 
                    ? input.selectedValues[0] 
                    : (input.value || '');
            } else if (input.tagName === 'SMART-DATE-INPUT') {
                value = input.value || '';
            } else if (input.tagName === 'SMART-FILE-UPLOAD') {
                // Handle file upload
                fileFields[key] = input.files || null;
                return;
            } else {
                // smart-input and others
                value = input.value || '';
            }
            
            // Convert empty strings to null
            rowData[key] = (value && String(value).trim() !== '') ? String(value).trim() : null;
        });

        // Dispatch event with row data
        if (this.editMode) {
            const event = new CustomEvent('tableEditSubmit', {
                detail: {
                    table: this.table,
                    rowData: rowData,
                    fileFields: fileFields,
                    tableName: this.tableName,
                    rowIndex: this.editRowIndex,
                    originalRowData: this.editRowData
                }
            });
            this.table.container.dispatchEvent(event);
        } else {
            const event = new CustomEvent('tableAddSubmit', {
                detail: {
                    table: this.table,
                    rowData: rowData,
                    fileFields: fileFields,
                    tableName: this.tableName
                }
            });
            this.table.container.dispatchEvent(event);
        }

        // Hide modal
        this.hide();
    }

    showModal() {
        if (this.modal && typeof this.modal.open === 'function') {
            this.modal.open();
        } else {
            // Fallback if Smart UI not ready
            this.modal.style.display = 'block';
        }
    }

    hide() {
        if (this.modal) {
            if (typeof this.modal.close === 'function') {
                this.modal.close();
            } else {
                this.modal.style.display = 'none';
            }
        }
    }
}

// Make AddModal available globally
if (typeof window !== 'undefined') {
    window.AddModal = AddModal;
}

