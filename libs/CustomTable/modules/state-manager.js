/**
 * State Manager Module
 * Handles localStorage persistence for table state
 */

class StateManager {
    constructor(storageKey) {
        this.storageKey = storageKey;
    }

    saveState(columnWidths, columnOrder, columnVisibility) {
        try {
            const state = {
                widths: columnWidths,
                order: columnOrder,
                visibility: columnVisibility
            };
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save table state:', e);
        }
    }

    loadState() {
        const result = {
            widths: {},
            order: [],
            visibility: {}
        };

        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const state = JSON.parse(saved);
                
                // Load widths with validation
                if (state.widths) {
                    for (const key in state.widths) {
                        const width = Number(state.widths[key]);
                        // Validate width (50px to 5000px)
                        if (!isNaN(width) && width >= 50 && width <= 5000) {
                            result.widths[key] = width;
                        }
                    }
                }
                
                // Load order
                if (Array.isArray(state.order)) {
                    result.order = state.order;
                }
                
                // Load visibility
                if (state.visibility) {
                    result.visibility = state.visibility;
                }
            }
        } catch (e) {
            console.warn('Failed to load table state:', e);
        }

        return result;
    }
}

