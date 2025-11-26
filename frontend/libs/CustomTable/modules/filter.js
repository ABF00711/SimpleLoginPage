/**
 * Filter Module
 * Handles search/filtering functionality
 */

class Filter {
    constructor(tableInstance) {
        this.table = tableInstance;
    }

    getInputTypeForColumn(columnType) {
        const typeLower = (columnType || 'string').toLowerCase();
        
        switch (typeLower) {
            case 'number':
            case 'integer':
            case 'int':
            case 'currency':
            case 'money':
            case 'percentage':
                return 'number';
            case 'date':
                return 'date';
            case 'datetime':
            case 'timestamp':
                return 'datetime-local';
            case 'boolean':
                return 'select'; // Handled separately
            default:
                return 'text';
        }
    }

    getInputAttributesForColumn(columnType) {
        const typeLower = (columnType || 'columnType').toLowerCase();
        let attrs = '';
        
        switch (typeLower) {
            case 'number':
            case 'integer':
            case 'int':
                attrs = 'step="1"';
                break;
            case 'currency':
            case 'money':
                attrs = 'step="0.01"';
                break;
            case 'percentage':
                attrs = 'step="0.01" min="0" max="100"';
                break;
        }
        
        return attrs;
    }

    getOperationsForColumnType(columnType) {
        const typeLower = (columnType || 'string').toLowerCase();
        
        switch (typeLower) {
            case 'number':
            case 'integer':
            case 'int':
            case 'currency':
            case 'money':
            case 'percentage':
                return [
                    { value: 'equal', label: 'equal' },
                    { value: 'not_equal', label: 'not equal' },
                    { value: 'less_than', label: 'less than' },
                    { value: 'less_than_or_equal', label: 'less than or equal' },
                    { value: 'greater_than', label: 'greater than' },
                    { value: 'greater_than_or_equal', label: 'greater than or equal' },
                    { value: 'in', label: 'in (selected)' },
                    { value: 'not_in', label: 'not in (selected)' },
                    { value: 'empty', label: 'empty' }
                ];
            
            case 'date':
                return [
                    { value: 'equal', label: 'equal' },
                    { value: 'not_equal', label: 'not equal' },
                    { value: 'before', label: 'before' },
                    { value: 'before_or_equal', label: 'before or equal' },
                    { value: 'after', label: 'after' },
                    { value: 'after_or_equal', label: 'after or equal' },
                    { value: 'empty', label: 'empty' },
                    { value: 'not_empty', label: 'not empty' }
                ];
            
            case 'datetime':
            case 'timestamp':
                return [
                    { value: 'equal', label: 'equal' },
                    { value: 'not_equal', label: 'not equal' },
                    { value: 'before', label: 'before' },
                    { value: 'before_or_equal', label: 'before or equal' },
                    { value: 'after', label: 'after' },
                    { value: 'after_or_equal', label: 'after or equal' },
                    { value: 'empty', label: 'empty' },
                    { value: 'not_empty', label: 'not empty' }
                ];
            
            case 'boolean':
                return [
                    { value: 'equal', label: 'equal' },
                    { value: 'not_equal', label: 'not equal' },
                    { value: 'empty', label: 'empty' },
                    { value: 'not_empty', label: 'not empty' }
                ];
            
            default: // string, text
                return [
                    { value: 'contains', label: 'contains' },
                    { value: 'does_not_contain', label: 'does not contain' },
                    { value: 'equals', label: 'equals' },
                    { value: 'not_equals', label: 'not equals' },
                    { value: 'starts_with', label: 'starts with' },
                    { value: 'ends_with', label: 'ends with' },
                    { value: 'in', label: 'in (selected)' },
                    { value: 'not_in', label: 'not in (selected)' },
                    { value: 'empty', label: 'empty' }
                ];
        }
    }

    getDefaultOperationForColumnType(columnType) {
        const typeLower = (columnType || 'string').toLowerCase();
        
        switch (typeLower) {
            case 'number':
            case 'integer':
            case 'int':
            case 'currency':
            case 'money':
            case 'percentage':
            case 'date':
            case 'datetime':
            case 'timestamp':
            case 'boolean':
                return 'equal';
            default:
                return 'contains';
        }
    }

    applyFilters() {
        const visibleColumns = this.table.columnManager.getVisibleColumns(
            this.table.options.columns,
            this.table.columnOrder
        );

        this.table.filteredData = this.table.originalData.filter(row => {
            return visibleColumns.every(column => {
                const searchValue = this.table.searchValues[column.key];
                const operation = this.table.filterOperations[column.key] || 
                                 this.getDefaultOperationForColumnType(column.type);
                
                const cellValue = this.table.formatter.getCellValue(row, column);
                
                // Handle empty/not_empty operations (don't require search value)
                if (operation === 'empty' || operation === 'not_empty') {
                    const isEmpty = cellValue === null || cellValue === undefined || cellValue === '';
                    return operation === 'empty' ? isEmpty : !isEmpty;
                }
                
                // If no search value for other operations, include the row
                if (!searchValue || searchValue === '') {
                    return true;
                }
                
                return this.applyFilterOperation(cellValue, searchValue, operation, column.type);
            });
        });
    }

    applyFilterOperation(cellValue, searchValue, operation, columnType) {
        const typeLower = (columnType || 'string').toLowerCase();
        const cellStr = String(cellValue || '').toLowerCase();
        const searchStr = String(searchValue || '').toLowerCase();
        
        // Handle string operations
        if (typeLower === 'string' || typeLower === 'text') {
            switch (operation) {
                case 'contains':
                    return cellStr.includes(searchStr);
                case 'does_not_contain':
                    return !cellStr.includes(searchStr);
                case 'equals':
                    return cellStr === searchStr;
                case 'not_equals':
                    return cellStr !== searchStr;
                case 'starts_with':
                    return cellStr.startsWith(searchStr);
                case 'ends_with':
                    return cellStr.endsWith(searchStr);
                case 'in':
                case 'not_in':
                    // For "in" operations, searchValue should be comma-separated
                    const values = searchStr.split(',').map(v => v.trim());
                    const isIn = values.some(v => cellStr === v);
                    return operation === 'in' ? isIn : !isIn;
                default:
                    return cellStr.includes(searchStr);
            }
        }
        
        // Handle number operations
        if (['number', 'integer', 'int', 'currency', 'money', 'percentage'].includes(typeLower)) {
            const numValue = Number(cellValue);
            const numSearch = Number(searchValue);
            
            if (isNaN(numValue) || isNaN(numSearch)) {
                // Fallback to string comparison
                return cellStr.includes(searchStr);
            }
            
            switch (operation) {
                case 'equal':
                    return numValue === numSearch;
                case 'not_equal':
                    return numValue !== numSearch;
                case 'less_than':
                    return numValue < numSearch;
                case 'less_than_or_equal':
                    return numValue <= numSearch;
                case 'greater_than':
                    return numValue > numSearch;
                case 'greater_than_or_equal':
                    return numValue >= numSearch;
                case 'in':
                case 'not_in':
                    const values = searchStr.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v));
                    const isIn = values.some(v => numValue === v);
                    return operation === 'in' ? isIn : !isIn;
                default:
                    return numValue === numSearch;
            }
        }
        
        // Handle date operations
        if (typeLower === 'date') {
            const dateValue = new Date(cellValue);
            const dateSearch = new Date(searchValue);
            
            if (isNaN(dateValue.getTime()) || isNaN(dateSearch.getTime())) {
                return cellStr.includes(searchStr);
            }
            
            const dateValueOnly = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
            const dateSearchOnly = new Date(dateSearch.getFullYear(), dateSearch.getMonth(), dateSearch.getDate());
            const dateValueTime = dateValueOnly.getTime();
            const dateSearchTime = dateSearchOnly.getTime();
            
            switch (operation) {
                case 'equal':
                    return dateValueTime === dateSearchTime;
                case 'not_equal':
                    return dateValueTime !== dateSearchTime;
                case 'before':
                    return dateValueTime < dateSearchTime;
                case 'before_or_equal':
                    return dateValueTime <= dateSearchTime;
                case 'after':
                    return dateValueTime > dateSearchTime;
                case 'after_or_equal':
                    return dateValueTime >= dateSearchTime;
                default:
                    return dateValueTime === dateSearchTime;
            }
        }
        
        // Handle datetime operations
        if (typeLower === 'datetime' || typeLower === 'timestamp') {
            const dtValue = new Date(cellValue);
            const dtSearch = new Date(searchValue);
            
            if (isNaN(dtValue.getTime()) || isNaN(dtSearch.getTime())) {
                return cellStr.includes(searchStr);
            }
            
            const dtValueTime = dtValue.getTime();
            const dtSearchTime = dtSearch.getTime();
            
            switch (operation) {
                case 'equal':
                    return dtValueTime === dtSearchTime;
                case 'not_equal':
                    return dtValueTime !== dtSearchTime;
                case 'before':
                    return dtValueTime < dtSearchTime;
                case 'before_or_equal':
                    return dtValueTime <= dtSearchTime;
                case 'after':
                    return dtValueTime > dtSearchTime;
                case 'after_or_equal':
                    return dtValueTime >= dtSearchTime;
                default:
                    return dtValueTime === dtSearchTime;
            }
        }
        
        // Handle boolean operations
        if (typeLower === 'boolean' || typeLower === 'bool') {
            const boolValue = cellStr === 'true' || cellStr === '1' || cellStr === 'yes' || cellValue === true;
            const boolSearch = searchStr === 'true' || searchStr === '1' || searchStr === 'yes';
            
            switch (operation) {
                case 'equal':
                    return boolValue === boolSearch;
                case 'not_equal':
                    return boolValue !== boolSearch;
                default:
                    return boolValue === boolSearch;
            }
        }
        
        // Default: string contains
        return cellStr.includes(searchStr);
    }

    attachSearchListeners() {
        const searchInputs = this.table.container.querySelectorAll('.table-search-input');
        let debounceTimer = null;
        
        searchInputs.forEach(input => {
            const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
            
            input.addEventListener(eventType, (e) => {
                const colKey = input.getAttribute('data-column-key');
                const value = input.value.trim();
                
                // Update search values
                if (value === '') {
                    delete this.table.searchValues[colKey];
                } else {
                    this.table.searchValues[colKey] = value;
                }
                
                // Save search pattern state
                this.table.stateManager.saveSearchPatternState(
                    this.table.sorter.sortColumn,
                    this.table.sorter.sortDirection,
                    this.table.searchValues,
                    this.table.filterOperations
                );
                
                // Debounce filtering to avoid excessive re-renders
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.applyFilters();
                    // Only update data rows, not the entire table (preserves search input focus)
                    this.table.renderer.updateDataRows();
                }, 300); // 300ms debounce
            });
        });
        
        // Attach operation selector listeners
        this.attachOperationListeners();
    }

    positionDropdown(button, dropdown) {
        // Get button position relative to viewport
        const buttonRect = button.getBoundingClientRect();
        
        // Temporarily show dropdown to measure its dimensions
        const wasVisible = dropdown.classList.contains('show');
        dropdown.style.display = 'block';
        dropdown.style.visibility = 'hidden';
        dropdown.style.opacity = '0';
        
        const dropdownRect = dropdown.getBoundingClientRect();
        const dropdownHeight = dropdownRect.height || 200;
        const dropdownWidth = dropdownRect.width || 180;
        
        // Calculate available space
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const spaceRight = viewportWidth - buttonRect.right;
        const spaceLeft = buttonRect.left;
        const spaceBottom = viewportHeight - buttonRect.bottom;
        const spaceTop = buttonRect.top;
        
        // Default: position below button, aligned to right
        let top = buttonRect.bottom + 4;
        let right = viewportWidth - buttonRect.right;
        let left = 'auto';
        let bottom = 'auto';
        
        // If not enough space below, position above
        if (spaceBottom < dropdownHeight && spaceTop > dropdownHeight) {
            top = 'auto';
            bottom = viewportHeight - buttonRect.top + 4;
        }
        
        // If not enough space on right, align to left
        if (spaceRight < dropdownWidth && spaceLeft > dropdownWidth) {
            right = 'auto';
            left = buttonRect.left;
        }
        
        // Apply calculated position
        dropdown.style.top = top !== 'auto' ? top + 'px' : 'auto';
        dropdown.style.bottom = bottom !== 'auto' ? bottom + 'px' : 'auto';
        dropdown.style.left = left !== 'auto' ? left + 'px' : 'auto';
        dropdown.style.right = right !== 'auto' ? right + 'px' : 'auto';
        
        // Restore visibility
        dropdown.style.visibility = '';
        dropdown.style.opacity = '';
        if (!wasVisible) {
            dropdown.style.display = '';
        }
    }

    attachOperationListeners() {
        const operationBtns = this.table.container.querySelectorAll('.filter-operation-btn');
        const operationDropdowns = this.table.container.querySelectorAll('.filter-operation-dropdown');
        
        // Toggle dropdown on button click
        operationBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const colKey = btn.getAttribute('data-column-key');
                const dropdown = this.table.container.querySelector(`.filter-operation-dropdown[data-column-key="${colKey}"]`);
                
                // Close all other dropdowns
                operationDropdowns.forEach(dd => {
                    if (dd !== dropdown) {
                        dd.classList.remove('show');
                    }
                });
                
                // Toggle current dropdown
                if (dropdown) {
                    const isOpen = dropdown.classList.contains('show');
                    if (!isOpen) {
                        // Position dropdown before showing
                        this.positionDropdown(btn, dropdown);
                    }
                    dropdown.classList.toggle('show');
                }
            });
        });
        
        // Handle operation selection
        const operationItems = this.table.container.querySelectorAll('.filter-operation-item');
        operationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const colKey = item.getAttribute('data-column-key');
                const operation = item.getAttribute('data-operation');
                
                // Update selected operation
                this.table.filterOperations[colKey] = operation;
                
                // Save search pattern state
                this.table.stateManager.saveSearchPatternState(
                    this.table.sorter.sortColumn,
                    this.table.sorter.sortDirection,
                    this.table.searchValues,
                    this.table.filterOperations
                );
                
                // Update UI - remove selected class from all items, add to clicked
                const allItems = this.table.container.querySelectorAll(`.filter-operation-item[data-column-key="${colKey}"]`);
                allItems.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                
                // Close dropdown
                const dropdown = this.table.container.querySelector(`.filter-operation-dropdown[data-column-key="${colKey}"]`);
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
                
                // Apply filters with new operation
                this.applyFilters();
                this.table.renderer.updateDataRows();
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const isDropdown = e.target.closest('.filter-operation-dropdown');
            const isButton = e.target.closest('.filter-operation-btn');
            if (!isDropdown && !isButton) {
                operationDropdowns.forEach(dd => dd.classList.remove('show'));
            }
        });
        
        // Reposition dropdowns on scroll/resize
        let resizeTimer = null;
        const handleReposition = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                operationDropdowns.forEach(dd => {
                    if (dd.classList.contains('show')) {
                        const colKey = dd.getAttribute('data-column-key');
                        const btn = this.table.container.querySelector(`.filter-operation-btn[data-column-key="${colKey}"]`);
                        if (btn) {
                            this.positionDropdown(btn, dd);
                        }
                    }
                });
            }, 100);
        };
        
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
    }
}

