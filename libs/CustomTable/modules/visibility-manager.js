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
        
        this.table.stateManager.saveState(
            this.table.columnWidths,
            this.table.columnOrder,
            this.table.columnVisibility
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
        
        this.table.stateManager.saveState(
            this.table.columnWidths,
            this.table.columnOrder,
            this.table.columnVisibility
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
            // Toggle dropdown on button click
            showColumnsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });

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

