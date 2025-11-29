/**
 * Pattern Manager Module
 * Handles CRUD operations for search patterns and layouts
 * Manages saved patterns/layouts in database (grid_searchpatterns, grid_layouts)
 */

class PatternManager {
    constructor(tableInstance, type) {
        this.table = tableInstance;
        this.type = type; // 'searchpattern' or 'layout'
        this.modal = null;
        this.currentButton = null;
    }

    async show(button, type) {
        this.type = type;
        this.currentButton = button;
        
        // Hide all existing pattern modals first
        const allModals = document.querySelectorAll('.pattern-modal');
        allModals.forEach(modal => {
            modal.style.display = 'none';
            modal.remove();
        });
        
        // Remove existing modal if any
        const modalId = `pattern-modal-${type}`;
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        this.createModal(modalId);
        
        // Position modal below button
        this.positionModal(button);
        
        // Load saved patterns/layouts
        await this.loadPatterns();
        
        // Show modal
        this.modal.style.display = 'block';
    }

    createModal(modalId) {
        const label = this.type === 'searchpattern' ? 'Search Patterns' : 'Layouts';
        
        const modalHTML = `
            <div id="${modalId}" class="pattern-modal" style="display: none;">
                <div class="pattern-modal-content">
                    <div class="pattern-modal-header">
                        <span class="pattern-modal-title">${label}</span>
                        <button type="button" class="pattern-modal-close" title="Close">×</button>
                    </div>
                    <div class="pattern-modal-body">
                        <div class="pattern-dropdown-wrapper">
                            <input type="text" 
                                   class="pattern-dropdown-input" 
                                   id="${modalId}-input"
                                   placeholder="Select or type to search..."
                                   autocomplete="off">
                            <div class="pattern-dropdown-list" id="${modalId}-dropdown"></div>
                        </div>
                        <div class="pattern-modal-actions">
                            <button type="button" class="pattern-btn pattern-btn-apply">Apply</button>
                            <button type="button" class="pattern-btn pattern-btn-save">Save</button>
                            <button type="button" class="pattern-btn pattern-btn-delete">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = modalHTML;
        document.body.appendChild(tempDiv.firstElementChild);

        this.modal = document.getElementById(modalId);
        this.attachEventListeners(modalId);
    }

    positionModal(button) {
        if (!this.modal || !button) return;

        // Wait for modal to be rendered to get its dimensions
        requestAnimationFrame(() => {
            const buttonRect = button.getBoundingClientRect();
            const modalRect = this.modal.getBoundingClientRect();
            
            // Position below button, aligned to left edge
            let top = buttonRect.bottom + window.scrollY + 5;
            let left = buttonRect.left + window.scrollX;
            
            // Adjust if modal goes off-screen to the right
            if (left + modalRect.width > window.innerWidth + window.scrollX) {
                left = window.innerWidth + window.scrollX - modalRect.width - 10;
            }
            
            // Adjust if modal goes off-screen to the left
            if (left < window.scrollX) {
                left = window.scrollX + 10;
            }
            
            // Adjust if modal goes off-screen below
            if (top + modalRect.height > window.innerHeight + window.scrollY) {
                // Position above button instead
                top = buttonRect.top + window.scrollY - modalRect.height - 5;
            }
            
            // Ensure modal doesn't go above viewport
            if (top < window.scrollY) {
                top = window.scrollY + 10;
            }
            
            this.modal.style.position = 'absolute';
            this.modal.style.top = `${top}px`;
            this.modal.style.left = `${left}px`;
            this.modal.style.zIndex = '10001';
        });
    }

    attachEventListeners(modalId) {
        const closeBtn = this.modal.querySelector('.pattern-modal-close');
        const input = this.modal.querySelector(`#${modalId}-input`);
        const dropdown = this.modal.querySelector(`#${modalId}-dropdown`);
        const applyBtn = this.modal.querySelector('.pattern-btn-apply');
        const saveBtn = this.modal.querySelector('.pattern-btn-save');
        const deleteBtn = this.modal.querySelector('.pattern-btn-delete');

        // Close button
        closeBtn.addEventListener('click', () => this.hide());

        // Close on outside click (use a single listener for all modals)
        const handleOutsideClick = (e) => {
            const allModals = document.querySelectorAll('.pattern-modal');
            allModals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    const button = modal.closest('.table-action-buttons')?.querySelector('.table-search-pattern-btn, .table-layout-btn');
                    if (!modal.contains(e.target) && !button?.contains(e.target)) {
                        modal.style.display = 'none';
                    }
                }
            });
        };
        
        // Remove any existing listener and add new one
        document.removeEventListener('click', handleOutsideClick);
        document.addEventListener('click', handleOutsideClick);

        // Input search/filter
        let filteredItems = [];
        input.addEventListener('input', (e) => {
            const searchValue = e.target.value.toLowerCase();
            this.filterDropdown(searchValue);
        });

        input.addEventListener('focus', () => {
            dropdown.style.display = 'block';
        });

        // Close dropdown when clicking outside of input and dropdown
        const closeDropdownOnOutsideClick = (e) => {
            // Check if click is outside the input and dropdown
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        };

        // Use mousedown instead of click to close before other click handlers fire
        document.addEventListener('mousedown', closeDropdownOnOutsideClick);
        
        // Store the handler so we can remove it later if needed
        this._dropdownCloseHandler = closeDropdownOnOutsideClick;

        // Apply button
        applyBtn.addEventListener('click', () => this.handleApply());

        // Save button
        saveBtn.addEventListener('click', () => this.handleSave());

        // Delete button
        deleteBtn.addEventListener('click', () => this.handleDelete());
    }

    async loadPatterns() {
        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getPatterns',
                    type: this.type,
                    tableName: this.getTableName()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                this.patterns = result.data || [];
                this.updateDropdown();
            } else {
                throw new Error(result.message || 'Failed to load patterns');
            }
        } catch (error) {
            console.error('Error loading patterns:', error);
            this.patterns = [];
            this.updateDropdown();
        }
    }

    updateDropdown() {
        const modalId = this.modal.id;
        const input = this.modal.querySelector(`#${modalId}-input`);
        const dropdown = this.modal.querySelector(`#${modalId}-dropdown`);
        
        if (!dropdown) return;

        if (this.patterns.length === 0) {
            dropdown.innerHTML = '<div class="pattern-dropdown-item">No saved patterns</div>';
            return;
        }

        let html = '';
        this.patterns.forEach((pattern, index) => {
            html += `<div class="pattern-dropdown-item" data-index="${index}" data-id="${pattern.id}">${this.escapeHtml(pattern.name)}</div>`;
        });
        dropdown.innerHTML = html;

        // Attach click listeners
        dropdown.querySelectorAll('.pattern-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                const index = parseInt(item.getAttribute('data-index'));
                const pattern = this.patterns[index];
                input.value = pattern.name;
                input.setAttribute('data-selected-id', pattern.id);
                dropdown.style.display = 'none';
            });
        });
    }

    filterDropdown(searchValue) {
        const modalId = this.modal.id;
        const dropdown = this.modal.querySelector(`#${modalId}-dropdown`);
        
        if (!dropdown) return;

        const items = dropdown.querySelectorAll('.pattern-dropdown-item');
        let hasMatch = false;

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchValue)) {
                item.style.display = 'block';
                hasMatch = true;
            } else {
                item.style.display = 'none';
            }
        });

        if (!hasMatch && searchValue) {
            dropdown.innerHTML = '<div class="pattern-dropdown-item">No matches found</div>';
        } else if (!hasMatch) {
            this.updateDropdown();
        }
    }

    async handleApply() {
        const modalId = this.modal.id;
        const input = this.modal.querySelector(`#${modalId}-input`);
        const selectedId = input.getAttribute('data-selected-id');

        if (!selectedId) {
            alert('Please select a pattern to apply');
            return;
        }

        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getPattern',
                    type: this.type,
                    id: selectedId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success' && result.data) {
                const patternData = JSON.parse(result.data.data);
                this.applyPattern(patternData);
                this.hide();
            } else {
                throw new Error(result.message || 'Failed to load pattern');
            }
        } catch (error) {
            console.error('Error applying pattern:', error);
            alert('Failed to apply pattern: ' + error.message);
        }
    }

    applyPattern(patternData) {
        if (this.type === 'searchpattern') {
            // Apply search pattern (sort and filter)
            if (patternData.sortColumn !== undefined) {
                this.table.sorter.sortColumn = patternData.sortColumn;
                this.table.sorter.sortDirection = patternData.sortDirection || 'asc';
            }
            if (patternData.searchValues) {
                this.table.searchValues = patternData.searchValues;
            }
            if (patternData.filterOperations) {
                this.table.filterOperations = patternData.filterOperations;
            }
            
            // Reapply filters first
            if (this.table.options.searchable) {
                this.table.filter.applyFilters();
            }
            
            // Apply sort if there's a sort column
            if (this.table.sorter.sortColumn !== null && this.table.sorter.sortColumn !== undefined) {
                // Sort the data (this will also render and update icons)
                this.table.sorter.sort(this.table.sorter.sortColumn, true);
            } else {
                // If no sort column, just render
                this.table.render();
            }
            
            // Ensure sort icons are updated after render (in case render was called multiple times)
            if (this.table.sorter.sortColumn !== null && this.table.sorter.sortColumn !== undefined) {
                // Use setTimeout to ensure DOM is ready
                setTimeout(() => {
                    this.table.sorter.updateSortIcons();
                }, 0);
            }
        } else if (this.type === 'layout') {
            // Apply layout (column widths, order, visibility)
            if (patternData.widths) {
                this.table.columnWidths = patternData.widths;
            }
            if (patternData.order) {
                this.table.columnOrder = patternData.order;
            }
            if (patternData.visibility) {
                this.table.columnVisibility = patternData.visibility;
                // Update columnManager with new visibility
                this.table.columnManager.columnVisibility = patternData.visibility;
                // Update columns' visible property
                this.table.options.columns.forEach(col => {
                    const colKey = col.key;
                    if (patternData.visibility[colKey] !== undefined) {
                        col.visible = patternData.visibility[colKey];
                    }
                });
            }
            this.table.render();
        }
    }

    async handleSave() {
        const modalId = this.modal.id;
        const input = this.modal.querySelector(`#${modalId}-input`);
        const name = input.value.trim();

        if (!name) {
            alert('Please enter a name for the pattern');
            return;
        }

        // Check if name already exists
        const existingPattern = this.patterns.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existingPattern) {
            const confirmed = confirm(`A pattern with the name "${name}" already exists. Do you want to update it?`);
            if (!confirmed) {
                return;
            }
        }

        // Get current state
        const currentState = this.getCurrentState();

        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'savePattern',
                    type: this.type,
                    tableName: this.getTableName(),
                    name: name,
                    data: JSON.stringify(currentState),
                    id: existingPattern ? existingPattern.id : null
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                alert(existingPattern ? 'Pattern updated successfully' : 'Pattern saved successfully');
                await this.loadPatterns();
                input.setAttribute('data-selected-id', result.id || existingPattern.id);
            } else {
                throw new Error(result.message || 'Failed to save pattern');
            }
        } catch (error) {
            console.error('Error saving pattern:', error);
            alert('Failed to save pattern: ' + error.message);
        }
    }

    async handleDelete() {
        const modalId = this.modal.id;
        const input = this.modal.querySelector(`#${modalId}-input`);
        const selectedId = input.getAttribute('data-selected-id');

        if (!selectedId) {
            alert('Please select a pattern to delete');
            return;
        }

        const pattern = this.patterns.find(p => p.id == selectedId);
        if (!pattern) {
            alert('Pattern not found');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete "${pattern.name}"?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deletePattern',
                    type: this.type,
                    id: selectedId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.status === 'success') {
                alert('Pattern deleted successfully');
                input.value = '';
                input.removeAttribute('data-selected-id');
                await this.loadPatterns();
            } else {
                throw new Error(result.message || 'Failed to delete pattern');
            }
        } catch (error) {
            console.error('Error deleting pattern:', error);
            alert('Failed to delete pattern: ' + error.message);
        }
    }

    getTableName() {
        // Extract table name from storage key or form name
        const storageKey = this.table.options.storageKey || '';
        const match = storageKey.match(/table_\w+_(\w+)/);
        if (match) {
            return match[1];
        }
        const formName = this.table.container.getAttribute('data-form-name');
        return formName || 'default';
    }

    getCurrentState() {
        // Get current state based on type
        if (this.type === 'searchpattern') {
            return {
                sortColumn: this.table.sorter.sortColumn,
                sortDirection: this.table.sorter.sortDirection,
                searchValues: this.table.searchValues || {},
                filterOperations: this.table.filterOperations || {}
            };
        } else if (this.type === 'layout') {
            return {
                widths: this.table.columnWidths || {},
                order: this.table.columnOrder || [],
                visibility: this.table.columnVisibility || {}
            };
        }
        return {};
    }

    hide() {
        // Hide all pattern modals
        const allModals = document.querySelectorAll('.pattern-modal');
        allModals.forEach(modal => {
            modal.style.display = 'none';
            // Also hide any dropdowns in the modal
            const dropdowns = modal.querySelectorAll('.pattern-dropdown-list');
            dropdowns.forEach(dd => dd.style.display = 'none');
        });
        if (this.modal) {
            this.modal.style.display = 'none';
            // Remove dropdown close handler if it exists
            if (this._dropdownCloseHandler) {
                document.removeEventListener('mousedown', this._dropdownCloseHandler);
                this._dropdownCloseHandler = null;
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Make PatternManager available globally
if (typeof window !== 'undefined') {
    window.PatternManager = PatternManager;
}

