/**
 * State Manager Module
 * Handles auto-save/auto-load of grid_state to/from database
 * Saves both "layout" (column state) and "searchpattern" (sort/filter state) in one JSON
 * Uses debouncing (2-3 seconds) to avoid too many API requests
 */

class StateManager {
    constructor(storageKey, tableName = null) {
        this.storageKey = storageKey;
        this.tableName = tableName;
        this.tableInstance = null; // Reference to table instance
        this.saveTimeout = null;
        this.pendingState = null;
        this.saveDelay = 2500; // 2.5 seconds debounce
    }

    /**
     * Set table name for database operations
     */
    setTableName(tableName) {
        this.tableName = tableName;
    }

    /**
     * Set table instance reference for auto-save
     */
    setTableInstance(tableInstance) {
        this.tableInstance = tableInstance;
    }

    /**
     * Auto-save grid_state to database with debouncing
     */
    autoSaveGridState(columnWidths, columnOrder, columnVisibility, sortColumn, sortDirection, searchValues, filterOperations) {
        if (!this.tableName) {
            console.warn('Table name not set. Cannot auto-save grid_state.');
            return;
        }

        // Ensure searchValues and filterOperations are objects, not arrays
        const safeSearchValues = (searchValues && typeof searchValues === 'object' && !Array.isArray(searchValues)) 
            ? searchValues 
            : {};
        const safeFilterOperations = (filterOperations && typeof filterOperations === 'object' && !Array.isArray(filterOperations)) 
            ? filterOperations 
            : {};
        
        // Ensure visibility is an object, not an array
        const safeVisibility = (columnVisibility && typeof columnVisibility === 'object' && !Array.isArray(columnVisibility)) 
            ? columnVisibility 
            : {};
        
        // Store pending state
        this.pendingState = {
            layout: {
                widths: columnWidths || {},
                order: Array.isArray(columnOrder) ? columnOrder : [],
                visibility: safeVisibility
            },
            searchpattern: {
                sortColumn: sortColumn,
                sortDirection: sortDirection || 'asc',
                searchValues: safeSearchValues,
                filterOperations: safeFilterOperations
            }
        };

        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        // Set new timeout for debounced save
        this.saveTimeout = setTimeout(() => {
            this.saveGridStateToDatabase();
        }, this.saveDelay);
    }

    /**
     * Actually save grid_state to database
     */
    async saveGridStateToDatabase() {
        if (!this.pendingState || !this.tableName) {
            return;
        }

        try {
            const response = await fetch('./backend/table-data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveGridState',
                    tableName: this.tableName,
                    data: this.pendingState
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message || 'Failed to save grid_state');
            }

            // Clear pending state after successful save
            this.pendingState = null;
        } catch (error) {
            console.error('Failed to auto-save grid_state:', error);
        }
    }

    /**
     * Auto-load grid_state from database
     */
    async loadGridStateFromDatabase() {
        if (!this.tableName) {
            console.warn('Table name not set. Cannot load grid_state.');
            return {
                layout: {
                    widths: {},
                    order: [],
                    visibility: {}
                },
                searchpattern: {
                    sortColumn: null,
                    sortDirection: 'asc',
                    searchValues: {},
                    filterOperations: {}
                }
            };
        }

        try {
            const response = await fetch(`./backend/table-data.php?action=getGridState&tableName=${encodeURIComponent(this.tableName)}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const result = await response.json();
            if (result.status === 'error') {
                throw new Error(result.message || 'Failed to load grid_state');
            }

            // Return loaded state or empty state if not found
            if (result.data) {
                return result.data;
            }

            // Return empty state if not found
            return {
                layout: {
                    widths: {},
                    order: [],
                    visibility: {}
                },
                searchpattern: {
                    sortColumn: null,
                    sortDirection: 'asc',
                    searchValues: {},
                    filterOperations: {}
                }
            };
        } catch (error) {
            console.error('Failed to load grid_state:', error);
            // Return empty state on error
            return {
                layout: {
                    widths: {},
                    order: [],
                    visibility: {}
                },
                searchpattern: {
                    sortColumn: null,
                    sortDirection: 'asc',
                    searchValues: {},
                    filterOperations: {}
                }
            };
        }
    }

    /**
     * Save layout state (triggers auto-save via table instance)
     * This method is called by modules, but we need full state to save
     * So we'll trigger the table's autoSaveGridState method instead
     */
    saveLayoutState(columnWidths, columnOrder, columnVisibility) {
        // This method is kept for compatibility but should not be called directly
        // Modules should call table.autoSaveGridState() instead
        if (this.tableInstance) {
            this.tableInstance.autoSaveGridState();
        }
    }

    /**
     * Save search pattern state (triggers auto-save via table instance)
     * This method is called by modules, but we need full state to save
     * So we'll trigger the table's autoSaveGridState method instead
     */
    saveSearchPatternState(sortColumn, sortDirection, searchValues, filterOperations) {
        // This method is kept for compatibility but should not be called directly
        // Modules should call table.autoSaveGridState() instead
        if (this.tableInstance) {
            this.tableInstance.autoSaveGridState();
        }
    }

    /**
     * Save both layout and search pattern state at once (triggers auto-save)
     */
    saveState(columnWidths, columnOrder, columnVisibility, sortColumn, sortDirection, searchValues, filterOperations) {
        this.autoSaveGridState(columnWidths, columnOrder, columnVisibility, sortColumn, sortDirection, searchValues, filterOperations);
    }

    /**
     * Load layout state (column widths, order, visibility)
     * Now loads from database via loadGridStateFromDatabase
     */
    async loadLayoutState() {
        const gridState = await this.loadGridStateFromDatabase();
        const layout = gridState.layout || {};
        
        const result = {
            widths: {},
            order: [],
            visibility: {}
        };
        
        // Load widths with validation
        if (layout.widths) {
            for (const key in layout.widths) {
                const width = Number(layout.widths[key]);
                // Validate width (50px to 5000px)
                if (!isNaN(width) && width >= 50 && width <= 5000) {
                    result.widths[key] = width;
                }
            }
        }
        
        // Load order
        if (Array.isArray(layout.order)) {
            result.order = layout.order;
        }
        
        // Load visibility - ensure it's an object, not an array
        if (layout.visibility) {
            // If it's an array (from old data), convert to empty object
            if (Array.isArray(layout.visibility)) {
                result.visibility = {};
            } else if (typeof layout.visibility === 'object') {
                result.visibility = layout.visibility;
            } else {
                result.visibility = {};
            }
        }

        return result;
    }

    /**
     * Load search pattern state (sort and filter)
     * Now loads from database via loadGridStateFromDatabase
     */
    async loadSearchPatternState() {
        const gridState = await this.loadGridStateFromDatabase();
        const searchpattern = gridState.searchpattern || {};
        
        const result = {
            sortColumn: null,
            sortDirection: 'asc',
            searchValues: {},
            filterOperations: {}
        };
        
        // Load sort state
        if (searchpattern.sortColumn !== undefined && searchpattern.sortColumn !== null) {
            result.sortColumn = searchpattern.sortColumn;
        }
        if (searchpattern.sortDirection) {
            result.sortDirection = searchpattern.sortDirection;
        }
        
        // Load filter state - ensure they are objects, not arrays
        if (searchpattern.searchValues) {
            // If it's an array (from old data), convert to empty object
            if (Array.isArray(searchpattern.searchValues)) {
                result.searchValues = {};
            } else if (typeof searchpattern.searchValues === 'object') {
                result.searchValues = searchpattern.searchValues;
            } else {
                result.searchValues = {};
            }
        }
        if (searchpattern.filterOperations) {
            // If it's an array (from old data), convert to empty object
            if (Array.isArray(searchpattern.filterOperations)) {
                result.filterOperations = {};
            } else if (typeof searchpattern.filterOperations === 'object') {
                result.filterOperations = searchpattern.filterOperations;
            } else {
                result.filterOperations = {};
            }
        }

        return result;
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use loadLayoutState instead
     */
    loadState() {
        return this.loadLayoutState();
    }
}

