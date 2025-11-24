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

    applyFilters() {
        const visibleColumns = this.table.columnManager.getVisibleColumns(
            this.table.options.columns,
            this.table.columnOrder
        );

        this.table.filteredData = this.table.originalData.filter(row => {
            return visibleColumns.every(column => {
                const searchValue = this.table.searchValues[column.key];
                
                // If no search value, include the row
                if (!searchValue || searchValue === '') {
                    return true;
                }
                
                const cellValue = this.table.formatter.getCellValue(row, column);
                const typeLower = (column.type || 'string').toLowerCase();
                
                // Type-specific filtering
                switch (typeLower) {
                    case 'number':
                    case 'integer':
                    case 'int':
                    case 'currency':
                    case 'money':
                    case 'percentage':
                        // Numeric comparison
                        const numValue = Number(cellValue);
                        const numSearch = Number(searchValue);
                        if (isNaN(numValue) || isNaN(numSearch)) {
                            // Fallback to string search if not numeric
                            return String(cellValue).toLowerCase().includes(String(searchValue).toLowerCase());
                        }
                        return numValue === numSearch;
                    
                    case 'date':
                        // Date comparison (compare date part only)
                        const dateValue = new Date(cellValue);
                        const dateSearch = new Date(searchValue);
                        if (isNaN(dateValue.getTime()) || isNaN(dateSearch.getTime())) {
                            return String(cellValue).toLowerCase().includes(String(searchValue).toLowerCase());
                        }
                        return dateValue.toDateString() === dateSearch.toDateString();
                    
                    case 'datetime':
                    case 'timestamp':
                        // DateTime comparison
                        const dtValue = new Date(cellValue);
                        const dtSearch = new Date(searchValue);
                        if (isNaN(dtValue.getTime()) || isNaN(dtSearch.getTime())) {
                            return String(cellValue).toLowerCase().includes(String(searchValue).toLowerCase());
                        }
                        return dtValue.getTime() === dtSearch.getTime();
                    
                    case 'boolean':
                        // Boolean exact match
                        const boolValue = String(cellValue).toLowerCase();
                        const boolSearch = String(searchValue).toLowerCase();
                        return boolValue === boolSearch || 
                               (boolSearch === 'true' && (boolValue === 'true' || boolValue === '1' || boolValue === 'yes')) ||
                               (boolSearch === 'false' && (boolValue === 'false' || boolValue === '0' || boolValue === 'no'));
                    
                    default:
                        // String: case-insensitive contains
                        return String(cellValue).toLowerCase().includes(String(searchValue).toLowerCase());
                }
            });
        });
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
                
                // Debounce filtering to avoid excessive re-renders
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.applyFilters();
                    // Only update data rows, not the entire table (preserves search input focus)
                    this.table.renderer.updateDataRows();
                }, 300); // 300ms debounce
            });
        });
    }
}

