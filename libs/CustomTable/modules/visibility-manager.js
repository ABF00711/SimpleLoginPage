/**
 * Visibility Manager Module
 * Handles column visibility functionality
 */

class VisibilityManager {
    constructor(tableInstance) {
        this.table = tableInstance;
    }

    attachVisibilityListeners() {
        const visibilityToggles = this.table.container.querySelectorAll('.column-visibility-toggle');
        visibilityToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const colKey = toggle.getAttribute('data-column-key');
                this.toggleColumnVisibility(colKey);
            });
        });
    }

    toggleColumnVisibility(colKey) {
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

            // Handle hidden column item clicks
            const hiddenItems = this.table.container.querySelectorAll('.hidden-column-item');
            hiddenItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const colKey = item.getAttribute('data-column-key');
                    this.toggleColumnVisibility(colKey);
                    dropdown.classList.remove('show');
                });
            });
        }
    }
}

