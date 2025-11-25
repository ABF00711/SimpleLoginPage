/**
 * State Manager Module
 * Handles localStorage persistence for table state
 * Saves both "layout" (column state) and "searchpattern" (sort/filter state) in one JSON
 */

class StateManager {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    /**
     * Save layout state (column widths, order, visibility)
     */
    saveLayoutState(columnWidths, columnOrder, columnVisibility) {
        try {
            // Load existing state or create new
            let fullState = this.loadFullState();
            
            // Update layout state
            fullState.layout = {
                widths: columnWidths,
                order: columnOrder,
                visibility: columnVisibility
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(fullState));
        } catch (e) {
            console.warn('Failed to save layout state:', e);
        }
    }

    /**
     * Save search pattern state (sort and filter)
     */
    saveSearchPatternState(sortColumn, sortDirection, searchValues, filterOperations) {
        try {
            // Load existing state or create new
            let fullState = this.loadFullState();
            
            // Update search pattern state
            fullState.searchpattern = {
                sortColumn: sortColumn,
                sortDirection: sortDirection,
                searchValues: searchValues,
                filterOperations: filterOperations
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(fullState));
        } catch (e) {
            console.warn('Failed to save search pattern state:', e);
        }
    }

    /**
     * Save both layout and search pattern state at once
     */
    saveState(columnWidths, columnOrder, columnVisibility, sortColumn, sortDirection, searchValues, filterOperations) {
        try {
            const fullState = {
                layout: {
                    widths: columnWidths,
                    order: columnOrder,
                    visibility: columnVisibility
                },
                searchpattern: {
                    sortColumn: sortColumn,
                    sortDirection: sortDirection,
                    searchValues: searchValues,
                    filterOperations: filterOperations
                }
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(fullState));
        } catch (e) {
            console.warn('Failed to save table state:', e);
        }
    }

    /**
     * Load full state (both layout and searchpattern)
     */
    loadFullState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load full state:', e);
        }
        
        return {
            layout: {},
            searchpattern: {}
        };
    }

    /**
     * Load layout state (column widths, order, visibility)
     */
    loadLayoutState() {
        const result = {
            widths: {},
            order: [],
            visibility: {}
        };

        try {
            const fullState = this.loadFullState();
            const layout = fullState.layout || {};
            
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
            
            // Load visibility
            if (layout.visibility) {
                result.visibility = layout.visibility;
            }
        } catch (e) {
            console.warn('Failed to load layout state:', e);
        }

        return result;
    }

    /**
     * Load search pattern state (sort and filter)
     */
    loadSearchPatternState() {
        const result = {
            sortColumn: null,
            sortDirection: 'asc',
            searchValues: {},
            filterOperations: {}
        };

        try {
            const fullState = this.loadFullState();
            const searchpattern = fullState.searchpattern || {};
            
            // Load sort state
            if (searchpattern.sortColumn !== undefined && searchpattern.sortColumn !== null) {
                result.sortColumn = searchpattern.sortColumn;
            }
            if (searchpattern.sortDirection) {
                result.sortDirection = searchpattern.sortDirection;
            }
            
            // Load filter state
            if (searchpattern.searchValues) {
                result.searchValues = searchpattern.searchValues;
            }
            if (searchpattern.filterOperations) {
                result.filterOperations = searchpattern.filterOperations;
            }
        } catch (e) {
            console.warn('Failed to load search pattern state:', e);
        }

        return result;
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use saveLayoutState or saveState instead
     */
    loadState() {
        return this.loadLayoutState();
    }
}

