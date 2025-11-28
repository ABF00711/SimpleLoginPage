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
    }

    async show() {
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
        // Remove existing modal if any
        const existingModal = document.getElementById('add-row-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        let modalHTML = `
            <smart-window id="add-row-modal" label="Add New Row" modal="true" resizable="false" 
                         style="width: 600px; max-width: 90vw; height: auto; max-height: 90vh;">
                <div class="add-modal-content" style="overflow-y: auto; max-height: calc(90vh - 100px);">
                    <form id="add-row-form" class="add-row-form">
        `;

        // Generate form fields based on field configurations
        this.fields.forEach(field => {
            const isRequired = field.mandatory ? 'required' : '';
            const requiredMark = field.mandatory ? '<span class="required-mark">*</span>' : '';
            const requiredClass = field.mandatory ? 'required-field' : '';
            
            modalHTML += `
                <div class="form-field">
                    <label for="field-${field.field_name}" class="form-label ${requiredClass}">
                        ${this.escapeHtml(field.field_label)} ${requiredMark}
                    </label>
                    <div class="form-input-wrapper">
            `;

            switch (field.field_type) {
                case 'text':
                    modalHTML += `
                        <input type="text" 
                               id="field-${field.field_name}" 
                               name="${field.field_name}" 
                               class="form-input ${requiredClass}" 
                               ${isRequired}>
                    `;
                    break;

                case 'number':
                    modalHTML += `
                        <input type="number" 
                               id="field-${field.field_name}" 
                               name="${field.field_name}" 
                               class="form-input ${requiredClass}" 
                               ${isRequired}>
                    `;
                    break;

                case 'date':
                    modalHTML += `
                        <input type="date" 
                               id="field-${field.field_name}" 
                               name="${field.field_name}" 
                               class="form-input ${requiredClass}" 
                               ${isRequired}>
                    `;
                    break;

                case 'combobox':
                    modalHTML += `
                        <div class="combobox-wrapper">
                            <input type="text" 
                                   id="field-${field.field_name}" 
                                   name="${field.field_name}" 
                                   class="form-input combobox-input ${requiredClass}" 
                                   data-lookup-sql="${this.escapeHtml(field.lookup_sql || '')}"
                                   autocomplete="off"
                                   ${isRequired}>
                            <div class="combobox-dropdown" id="dropdown-${field.field_name}"></div>
                        </div>
                    `;
                    break;

                case 'file':
                    modalHTML += `
                        <input type="file" 
                               id="field-${field.field_name}" 
                               name="${field.field_name}" 
                               class="form-input ${requiredClass}" 
                               ${isRequired}>
                    `;
                    break;

                default:
                    modalHTML += `
                        <input type="text" 
                               id="field-${field.field_name}" 
                               name="${field.field_name}" 
                               class="form-input ${requiredClass}" 
                               ${isRequired}>
                    `;
            }

            modalHTML += `
                    </div>
                </div>`;
        });

        modalHTML += `
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-cancel" id="add-modal-cancel">Cancel</button>
                    <button type="button" class="btn-submit" id="add-modal-submit">Add</button>
                </div>
            </smart-window>
        `;

        // Append to body
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        document.body.appendChild(tempDiv.firstElementChild);

        this.modal = document.getElementById('add-row-modal');
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Initialize combobox fields
        this.initializeComboboxes();
    }

    async initializeComboboxes() {
        const comboboxInputs = this.modal.querySelectorAll('.combobox-input');
        
        for (const input of comboboxInputs) {
            const lookupSql = input.getAttribute('data-lookup-sql');
            if (!lookupSql) continue;

            // Load lookup data
            await this.loadLookupData(lookupSql, input);
            
            // Attach autocomplete functionality
            this.attachComboboxListeners(input);
        }
    }

    async loadLookupData(lookupSql, input) {
        try {
            // Check cache first
            if (this.lookupData[lookupSql]) {
                input.lookupValues = this.lookupData[lookupSql];
                return;
            }

            // Fetch lookup data from backend
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'getLookupData',
                    lookupSql: lookupSql
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                this.lookupData[lookupSql] = result.data;
                input.lookupValues = result.data;
            }
        } catch (error) {
            console.error('Error loading lookup data:', error);
            input.lookupValues = [];
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
        const form = this.modal.querySelector('#add-row-form');
        const cancelBtn = this.modal.querySelector('#add-modal-cancel');
        const submitBtn = this.modal.querySelector('#add-modal-submit');

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
        const form = this.modal.querySelector('#add-row-form');
        
        // Manual validation for required fields (without showing browser default messages)
        let isValid = true;
        const errors = [];
        
        this.fields.forEach(field => {
            if (field.mandatory) {
                const input = form.querySelector(`#field-${field.field_name}`);
                if (!input || !input.value || input.value.trim() === '') {
                    isValid = false;
                    errors.push(field.field_label);
                    if (input) {
                        input.classList.add('error');
                    }
                } else {
                    if (input) {
                        input.classList.remove('error');
                    }
                }
            }
        });
        
        if (!isValid) {
            alert('Please fill in all required fields: ' + errors.join(', '));
            return;
        }

        // Collect form data
        const formData = new FormData(form);
        const rowData = {};
        const fileFields = {};

        // Process regular fields - convert empty strings to null
        for (const [key, value] of formData.entries()) {
            const field = this.fields.find(f => f.field_name === key);
            if (field && field.field_type === 'file') {
                fileFields[key] = formData.get(key);
            } else {
                // Convert empty strings to null
                rowData[key] = (value && value.trim() !== '') ? value : null;
            }
        }

        // Dispatch event with row data
        const event = new CustomEvent('tableAddSubmit', {
            detail: {
                table: this.table,
                rowData: rowData,
                fileFields: fileFields,
                tableName: this.tableName
            }
        });
        this.table.container.dispatchEvent(event);

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

