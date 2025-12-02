/**
 * Column Menu Module
 * Handles column menu dropdown with sorting and filtering options
 */

class ColumnMenu {
    constructor(tableInstance) {
        this.table = tableInstance;
        this.activeMenu = null; // Track which column menu is open
    }

    /**
     * Get unique values for a column (for filtering)
     */
    getUniqueValues(column) {
        const values = new Set();
        const blanks = [];
        
        this.table.originalData.forEach(row => {
            const cellValue = Formatter.getCellValue(row, column);
            const formattedValue = Formatter.formatCell(cellValue, column);
            
            if (cellValue === null || cellValue === undefined || cellValue === '' || formattedValue === '') {
                blanks.push(null);
            } else {
                values.add(formattedValue);
            }
        });
        
        // Convert to sorted array
        const sortedValues = Array.from(values).sort((a, b) => {
            const type = (column.type || 'string').toLowerCase();
            
            if (type === 'number' || type === 'integer' || type === 'int' || type === 'currency' || type === 'money' || type === 'percentage') {
                return Number(a) - Number(b);
            } else if (type === 'date' || type === 'datetime' || type === 'timestamp') {
                return new Date(a) - new Date(b);
            } else {
                return String(a).localeCompare(String(b));
            }
        });
        
        return {
            values: sortedValues,
            hasBlanks: blanks.length > 0
        };
    }

    /**
     * Get sort options based on column type
     */
    getSortOptions(column) {
        const type = (column.type || 'string').toLowerCase();
        
        if (type === 'number' || type === 'integer' || type === 'int' || type === 'currency' || type === 'money' || type === 'percentage') {
            return [
                { label: 'Sort 1 → 9', direction: 'asc', icon: '↑' },
                { label: 'Sort 9 → 1', direction: 'desc', icon: '↓' }
            ];
        } else if (type === 'date' || type === 'datetime' || type === 'timestamp') {
            return [
                { label: 'Sort Oldest → Newest', direction: 'asc', icon: '↑' },
                { label: 'Sort Newest → Oldest', direction: 'desc', icon: '↓' }
            ];
        } else {
            return [
                { label: 'Sort A → Z', direction: 'asc', icon: '↑' },
                { label: 'Sort Z → A', direction: 'desc', icon: '↓' }
            ];
        }
    }

    /**
     * Create column menu HTML
     */
    createMenuHTML(column, columnIndex) {
        const sortOptions = this.getSortOptions(column);
        const uniqueValues = this.getUniqueValues(column);
        const currentSort = this.table.sorter.sortColumn === columnIndex;
        const currentDirection = this.table.sorter.sortDirection;
        
        // Get current filter state for this column
        const selectedValues = this.table.columnFilters && this.table.columnFilters[column.key] 
            ? this.table.columnFilters[column.key] 
            : [];
        const searchTerm = this.table.columnFilterSearch && this.table.columnFilterSearch[column.key] 
            ? this.table.columnFilterSearch[column.key] 
            : '';
        
        // Filter values based on search term
        const filteredValues = uniqueValues.values.filter(val => 
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        let html = `
            <div class="column-menu" data-column-key="${column.key}" data-column-index="${columnIndex}">
                <div class="column-menu-sort">
        `;
        
        // Add sort options
        sortOptions.forEach(option => {
            const isActive = currentSort && currentDirection === option.direction;
            html += `
                <div class="column-menu-sort-option ${isActive ? 'active' : ''}" 
                     data-direction="${option.direction}" 
                     data-column-index="${columnIndex}">
                    <span class="sort-icon">${option.icon}</span>
                    <span>${option.label}</span>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="column-menu-divider"></div>
                <div class="column-menu-filter">
                    <div class="column-menu-filter-label">SHOW ROWS WHERE:</div>
                    <input type="text" 
                           class="column-menu-search" 
                           placeholder="Search values..." 
                           value="${Formatter.escapeHtml(searchTerm)}"
                           data-column-key="${column.key}">
                    <div class="column-menu-checkboxes">
                        <label class="column-menu-checkbox-item">
                            <input type="checkbox" 
                                   class="column-menu-checkbox select-all" 
                                   data-column-key="${column.key}"
                                   ${selectedValues.length === uniqueValues.values.length + (uniqueValues.hasBlanks ? 1 : 0) ? 'checked' : ''}>
                            <span>(Select All)</span>
                        </label>
        `;
        
        // Add blanks option if exists
        if (uniqueValues.hasBlanks) {
            const isBlanksSelected = selectedValues.includes('__BLANKS__');
            html += `
                        <label class="column-menu-checkbox-item">
                            <input type="checkbox" 
                                   class="column-menu-checkbox" 
                                   data-column-key="${column.key}"
                                   data-value="__BLANKS__"
                                   ${isBlanksSelected ? 'checked' : ''}>
                            <span>(Blanks)</span>
                        </label>
            `;
        }
        
        // Add value checkboxes
        filteredValues.forEach(value => {
            const isSelected = selectedValues.includes(value);
            html += `
                        <label class="column-menu-checkbox-item">
                            <input type="checkbox" 
                                   class="column-menu-checkbox" 
                                   data-column-key="${column.key}"
                                   data-value="${Formatter.escapeHtml(value)}"
                                   ${isSelected ? 'checked' : ''}>
                            <span>${Formatter.escapeHtml(value)}</span>
                        </label>
            `;
        });
        
        html += `
                    </div>
                </div>
                <div class="column-menu-actions">
                    <button class="column-menu-btn column-menu-btn-filter" data-column-key="${column.key}">FILTER</button>
                    <button class="column-menu-btn column-menu-btn-clear" data-column-key="${column.key}">CLEAR</button>
                </div>
            </div>
        `;
        
        return html;
    }

    /**
     * Show column menu
     */
    showMenu(columnIndex, buttonElement) {
        // Close any open menu
        this.hideMenu();
        
        const column = this.table.options.columns[columnIndex];
        if (!column) return;
        
        // Create menu element
        const menuHTML = this.createMenuHTML(column, columnIndex);
        const menuContainer = document.createElement('div');
        menuContainer.className = 'column-menu-container';
        menuContainer.innerHTML = menuHTML;
        
        // Position menu
        const buttonRect = buttonElement.getBoundingClientRect();
        const menu = menuContainer.querySelector('.column-menu');
        
        // Append to body for proper positioning
        document.body.appendChild(menuContainer);
        
        // Calculate position
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let top = buttonRect.bottom + 4;
        let left = buttonRect.left;
        
        // Adjust if menu goes off screen
        if (left + menuRect.width > viewportWidth) {
            left = viewportWidth - menuRect.width - 10;
        }
        if (top + menuRect.height > viewportHeight) {
            top = buttonRect.top - menuRect.height - 4;
        }
        if (left < 0) left = 10;
        if (top < 0) top = 10;
        
        menuContainer.style.position = 'fixed';
        menuContainer.style.top = top + 'px';
        menuContainer.style.left = left + 'px';
        menuContainer.style.zIndex = '10000';
        
        this.activeMenu = {
            container: menuContainer,
            columnIndex: columnIndex,
            columnKey: column.key,
            buttonElement: buttonElement
        };
        
        // Attach event listeners
        this.attachMenuListeners(menuContainer, column, columnIndex);
    }

    /**
     * Hide column menu
     */
    hideMenu() {
        if (this.activeMenu && this.activeMenu.container) {
            this.activeMenu.container.remove();
            this.activeMenu = null;
        }
    }

    /**
     * Attach event listeners to menu
     */
    attachMenuListeners(menuContainer, column, columnIndex) {
        // Sort option clicks
        const sortOptions = menuContainer.querySelectorAll('.column-menu-sort-option');
        sortOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const direction = option.getAttribute('data-direction');
                this.table.sorter.sortColumn = columnIndex;
                this.table.sorter.sortDirection = direction;
                this.table.sorter.sort(columnIndex, true);
                this.hideMenu();
            });
        });
        
        // Search input
        const searchInput = menuContainer.querySelector('.column-menu-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                e.stopPropagation();
                const searchTerm = e.target.value;
                
                // Initialize if needed
                if (!this.table.columnFilterSearch) {
                    this.table.columnFilterSearch = {};
                }
                this.table.columnFilterSearch[column.key] = searchTerm;
                
                // Re-render menu with filtered values
                if (this.activeMenu && this.activeMenu.buttonElement) {
                    this.showMenu(columnIndex, this.activeMenu.buttonElement);
                }
            });
        }
        
        // Checkbox changes
        const checkboxes = menuContainer.querySelectorAll('.column-menu-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const colKey = checkbox.getAttribute('data-column-key');
                const value = checkbox.getAttribute('data-value');
                const isSelectAll = checkbox.classList.contains('select-all');
                
                // Initialize if needed
                if (!this.table.columnFilters) {
                    this.table.columnFilters = {};
                }
                if (!this.table.columnFilters[colKey]) {
                    this.table.columnFilters[colKey] = [];
                }
                
                if (isSelectAll) {
                    // Select/deselect all
                    const uniqueValues = this.getUniqueValues(column);
                    if (checkbox.checked) {
                        this.table.columnFilters[colKey] = [...uniqueValues.values];
                        if (uniqueValues.hasBlanks) {
                            this.table.columnFilters[colKey].push('__BLANKS__');
                        }
                    } else {
                        this.table.columnFilters[colKey] = [];
                    }
                    
                    // Update all checkboxes
                    checkboxes.forEach(cb => {
                        if (cb !== checkbox) {
                            if (cb.getAttribute('data-value') === '__BLANKS__') {
                                cb.checked = checkbox.checked && uniqueValues.hasBlanks;
                            } else {
                                cb.checked = checkbox.checked;
                            }
                        }
                    });
                } else {
                    // Individual checkbox
                    if (checkbox.checked) {
                        if (!this.table.columnFilters[colKey].includes(value)) {
                            this.table.columnFilters[colKey].push(value);
                        }
                    } else {
                        this.table.columnFilters[colKey] = this.table.columnFilters[colKey].filter(v => v !== value);
                    }
                    
                    // Update "Select All" checkbox
                    const uniqueValues = this.getUniqueValues(column);
                    const totalItems = uniqueValues.values.length + (uniqueValues.hasBlanks ? 1 : 0);
                    const selectAllCheckbox = menuContainer.querySelector('.select-all');
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = this.table.columnFilters[colKey].length === totalItems;
                    }
                }
            });
        });
        
        // Filter button
        const filterBtn = menuContainer.querySelector('.column-menu-btn-filter');
        if (filterBtn) {
            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.applyColumnFilter(column);
                this.hideMenu();
            });
        }
        
        // Clear button
        const clearBtn = menuContainer.querySelector('.column-menu-btn-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.clearColumnFilter(column);
                this.hideMenu();
            });
        }
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
        }, 0);
    }

    /**
     * Handle clicks outside menu
     */
    handleOutsideClick(e) {
        if (this.activeMenu && this.activeMenu.container) {
            if (!this.activeMenu.container.contains(e.target)) {
                this.hideMenu();
            }
        }
    }

    /**
     * Apply column filter
     */
    applyColumnFilter(column) {
        // Initialize if needed
        if (!this.table.columnFilters) {
            this.table.columnFilters = {};
        }
        
        const selectedValues = this.table.columnFilters[column.key] || [];
        
        // Apply filter to filteredData
        if (selectedValues.length === 0) {
            // No filter applied, show all
            this.table.filteredData = [...this.table.originalData];
        } else {
            this.table.filteredData = this.table.originalData.filter(row => {
                const cellValue = Formatter.getCellValue(row, column);
                const formattedValue = Formatter.formatCell(cellValue, column);
                
                // Check if value matches any selected filter
                if (cellValue === null || cellValue === undefined || cellValue === '' || formattedValue === '') {
                    return selectedValues.includes('__BLANKS__');
                } else {
                    return selectedValues.includes(formattedValue);
                }
            });
        }
        
        // Re-render table
        this.table.renderer.updateDataRows();
        this.table.renderer.updateStatusBar();
        
        // Save state
        this.table.autoSaveGridState();
    }

    /**
     * Clear column filter
     */
    clearColumnFilter(column) {
        if (this.table.columnFilters && this.table.columnFilters[column.key]) {
            delete this.table.columnFilters[column.key];
        }
        
        // Re-apply all filters
        this.table.filter.applyFilters();
        this.table.renderer.updateDataRows();
        this.table.renderer.updateStatusBar();
        
        // Save state
        this.table.autoSaveGridState();
    }

    /**
     * Attach menu button listeners to headers
     */
    attachMenuButtonListeners() {
        const menuButtons = this.table.container.querySelectorAll('.column-menu-btn-trigger');
        
        menuButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const columnIndex = parseInt(button.getAttribute('data-column-index'));
                this.showMenu(columnIndex, button);
            });
        });
    }
}

