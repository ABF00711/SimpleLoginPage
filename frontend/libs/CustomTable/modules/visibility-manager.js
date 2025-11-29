/**
 * Visibility Manager Module
 * Handles column visibility functionality
 */

class VisibilityManager {
    constructor(tableInstance) {
        this.table = tableInstance;
        this.menuClickHandler = null; // Store handler reference to remove duplicates
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
        } else {
            console.warn('Column not found for key:', colKey);
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
                const showColumnsBtn = this.table.container.querySelector('.show-columns-btn');
                if (newDropdown && showColumnsBtn) {
                    newDropdown.classList.add('show');
                    this.positionDropdown(showColumnsBtn, newDropdown);
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
                const showColumnsBtn = this.table.container.querySelector('.show-columns-btn');
                if (newDropdown && showColumnsBtn) {
                    newDropdown.classList.add('show');
                    this.positionDropdown(showColumnsBtn, newDropdown);
                }
            }, 0);
        }
    }

    attachHiddenColumnsMenu() {
        const showColumnsBtn = this.table.container.querySelector('.show-columns-btn');
        const dropdown = this.table.container.querySelector('.hidden-columns-dropdown');
        
        if (showColumnsBtn && dropdown) {
            // Remove any existing listeners to prevent duplicates
            const newShowColumnsBtn = showColumnsBtn.cloneNode(true);
            showColumnsBtn.parentNode.replaceChild(newShowColumnsBtn, showColumnsBtn);
            const newBtn = this.table.container.querySelector('.show-columns-btn');
            
            // Function to toggle dropdown
            const toggleDropdown = (e) => {
                if (e) {
                    e.stopPropagation(); // Prevent bubbling to document
                    e.preventDefault();
                }
                const isShowing = dropdown.classList.contains('show');
                dropdown.classList.toggle('show');
                
                // Position dropdown below Hide button when showing
                if (!isShowing) {
                    this.positionDropdown(newBtn, dropdown);
                }
            };

            // Attach click event to button - MUST stop propagation
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Critical: prevent document click handler from firing
                e.preventDefault();
                        toggleDropdown(e);
                    });
                    
            // Close dropdown when clicking outside (but not on button or dropdown)
            // Use a named function and check the new button reference
            const closeDropdownHandler = (e) => {
                // Don't close if clicking on button or inside dropdown
                if (newBtn.contains(e.target) || dropdown.contains(e.target)) {
                        return;
                    }
                // Close if clicking outside
                if (dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                    }
                };

            // Remove any existing listener to prevent duplicates
            document.removeEventListener('click', closeDropdownHandler);
            document.addEventListener('click', closeDropdownHandler);

            // Handle column item clicks (toggle visibility) - use event delegation on container
            // This way it works even after the dropdown is re-rendered
            // Remove existing handler if it exists to prevent duplicates
            if (this.menuClickHandler) {
                this.table.container.removeEventListener('click', this.menuClickHandler);
                }

            // Create new handler and store reference
            this.menuClickHandler = (e) => {
                // Check if click is on a column item
                const columnItem = e.target.closest('.hidden-column-item');
                if (columnItem) {
                    e.stopPropagation();
                    const colKey = columnItem.getAttribute('data-column-key');
                    if (colKey) {
                        this.toggleColumnVisibility(colKey);
                    }
                    return; // Don't process further
                }

                // Check if click is on reset button
                const resetBtn = e.target.closest('.hidden-column-reset');
            if (resetBtn) {
                    e.stopPropagation();
                    this.resetColumnVisibility();
                    dropdown.classList.remove('show');
                }
            };
            
            // Attach to container (which persists) instead of menu (which gets recreated)
            this.table.container.addEventListener('click', this.menuClickHandler);

            // Reset button is now handled by event delegation above
        }
    }

    positionDropdown(button, dropdown) {
        if (!button || !dropdown) return;

        // Wait for dropdown to be visible to get its dimensions
        requestAnimationFrame(() => {
            const buttonRect = button.getBoundingClientRect();
            const dropdownRect = dropdown.getBoundingClientRect();
            
            // Position below button, aligned to left edge
            let top = buttonRect.bottom + window.scrollY + 5;
            let left = buttonRect.left + window.scrollX;
            
            // Adjust if dropdown goes off-screen to the right
            if (left + dropdownRect.width > window.innerWidth + window.scrollX) {
                left = window.innerWidth + window.scrollX - dropdownRect.width - 10;
            }
            
            // Adjust if dropdown goes off-screen to the left
            if (left < window.scrollX) {
                left = window.scrollX + 10;
            }
            
            // Adjust if dropdown goes off-screen below
            if (top + dropdownRect.height > window.innerHeight + window.scrollY) {
                // Position above button instead
                top = buttonRect.top + window.scrollY - dropdownRect.height - 5;
            }
            
            // Ensure dropdown doesn't go above viewport
            if (top < window.scrollY) {
                top = window.scrollY + 10;
            }
            
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${top - window.scrollY}px`;
            dropdown.style.left = `${left - window.scrollX}px`;
            dropdown.style.zIndex = '10004'; // Higher than pattern modals
        });
    }
}

