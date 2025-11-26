/**
 * Visibility Manager Module
 * Handles column visibility functionality
 */

class VisibilityManager {
    constructor(tableInstance) {
        this.table = tableInstance;
    }

    toggleColumnVisibility(colKey) {
        // Check if dropdown is open before rendering
        const dropdown = this.table.container.querySelector('.hidden-columns-dropdown');
        const wasOpen = dropdown && dropdown.classList.contains('show');
        
        const currentVisibility = this.table.columnVisibility[colKey];
        this.table.columnVisibility[colKey] = currentVisibility === false;
        
        // Update column object
        const column = this.table.options.columns.find(col => col.key === colKey);
        if (column) {
            column.visible = this.table.columnVisibility[colKey];
        }
        
        this.table.stateManager.saveLayoutState(
            this.table.columnWidths,
            this.table.columnOrder,
            this.table.columnVisibility
        );
        this.table.stateManager.saveSearchPatternState(
            this.table.sorter.sortColumn,
            this.table.sorter.sortDirection,
            this.table.searchValues,
            this.table.filterOperations
        );
        this.table.render();
        
        // Re-open dropdown if it was open before rendering
        if (wasOpen) {
            setTimeout(() => {
                const newDropdown = this.table.container.querySelector('.hidden-columns-dropdown');
                if (newDropdown) {
                    newDropdown.classList.add('show');
                }
            }, 0);
        }
    }

    resetColumnVisibility() {
        // Check if dropdown is open before rendering
        const dropdown = this.table.container.querySelector('.hidden-columns-dropdown');
        const wasOpen = dropdown && dropdown.classList.contains('show');
        
        // Reset all columns to visible
        this.table.options.columns.forEach(column => {
            const colKey = column.key;
            this.table.columnVisibility[colKey] = true;
            column.visible = true;
        });
        
        this.table.stateManager.saveLayoutState(
            this.table.columnWidths,
            this.table.columnOrder,
            this.table.columnVisibility
        );
        this.table.stateManager.saveSearchPatternState(
            this.table.sorter.sortColumn,
            this.table.sorter.sortDirection,
            this.table.searchValues,
            this.table.filterOperations
        );
        this.table.render();
        
        // Re-open dropdown if it was open before rendering
        if (wasOpen) {
            setTimeout(() => {
                const newDropdown = this.table.container.querySelector('.hidden-columns-dropdown');
                if (newDropdown) {
                    newDropdown.classList.add('show');
                }
            }, 0);
        }
    }

    attachHiddenColumnsMenu() {
        const showColumnsBtn = this.table.container.querySelector('.show-columns-btn');
        const dropdown = this.table.container.querySelector('.hidden-columns-dropdown');
        
        if (showColumnsBtn && dropdown) {
            // Function to toggle dropdown
            const toggleDropdown = (e) => {
                if (e) {
                    e.stopPropagation();
                }
                dropdown.classList.toggle('show');
            };

            // Handle Smart UI button click
            if (showColumnsBtn.tagName === 'SMART-BUTTON') {
                // Wait for Smart UI to upgrade the button
                const attachSmartButtonClick = () => {
                    // Method 1: Use Smart UI's onClick property (preferred for Smart UI)
                    if (showColumnsBtn.onClick !== undefined) {
                        const originalOnClick = showColumnsBtn.onClick;
                        showColumnsBtn.onClick = (e) => {
                            if (originalOnClick) {
                                originalOnClick.call(showColumnsBtn, e);
                            }
                            toggleDropdown(e);
                        };
                    }
                    
                    // Method 2: Also use addEventListener as fallback
                    showColumnsBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleDropdown(e);
                    });
                    
                    // Method 3: Handle clicks on child elements (icon, text)
                    const icon = showColumnsBtn.querySelector('.show-columns-icon');
                    const text = showColumnsBtn.querySelector('.show-columns-text');
                    
                    if (icon) {
                        icon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            toggleDropdown(e);
                        });
                    }
                    if (text) {
                        text.addEventListener('click', (e) => {
                            e.stopPropagation();
                            toggleDropdown(e);
                        });
                    }
                };

                // Wait for Smart UI to be ready and button to be upgraded
                const waitForSmartUI = (attempts = 0) => {
                    if (attempts > 20) {
                        // Fallback: attach anyway after max attempts
                        attachSmartButtonClick();
                        return;
                    }
                    
                    if (typeof Smart !== 'undefined' && Smart.elements) {
                        // Give Smart UI a moment to upgrade the element
                        setTimeout(() => {
                            attachSmartButtonClick();
                        }, 150);
                    } else {
                        // Retry if Smart UI is not ready yet
                        setTimeout(() => waitForSmartUI(attempts + 1), 50);
                    }
                };

                // Start waiting for Smart UI
                waitForSmartUI();
            } else {
                // Regular button, attach immediately
                showColumnsBtn.addEventListener('click', toggleDropdown);
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.table.container.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });

            // Handle column item clicks (toggle visibility)
            const columnItems = this.table.container.querySelectorAll('.hidden-column-item');
            columnItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const colKey = item.getAttribute('data-column-key');
                    if (colKey) {
                        this.toggleColumnVisibility(colKey);
                    }
                });
            });

            // Handle Reset button click
            const resetBtn = this.table.container.querySelector('.hidden-column-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.resetColumnVisibility();
                    dropdown.classList.remove('show');
                });
            }
        }
    }
}

