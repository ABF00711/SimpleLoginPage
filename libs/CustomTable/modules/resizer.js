/**
 * Resizer Module
 * Handles column resizing functionality
 */

class Resizer {
    constructor(tableInstance) {
        this.table = tableInstance;
        this.isResizing = false;
        this.resizeColumnIndex = null;
        this.dragStartX = 0;
        this.dragStartWidth = 0;
    }

    attachResizeListeners() {
        const resizeHandles = this.table.container.querySelectorAll('.column-resize-handle');
        resizeHandles.forEach((handle, index) => {
            // Mouse events
            handle.addEventListener('mousedown', (e) => this.startResize(e, handle));
            
            // Touch events for mobile
            handle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startResize(e, handle);
            }, { passive: false });
        });

        // Global mouse/touch move and up events
        document.addEventListener('mousemove', (e) => this.handleResize(e));
        document.addEventListener('mouseup', () => this.stopResize());
        document.addEventListener('touchmove', (e) => {
            if (this.isResizing) {
                e.preventDefault();
                this.handleResize(e);
            }
        }, { passive: false });
        document.addEventListener('touchend', () => this.stopResize());
    }

    startResize(e, handle) {
        e.preventDefault();
        e.stopPropagation();
        
        const header = handle.closest('.table-header');
        const columnIndex = parseInt(header.getAttribute('data-column'));
        const displayIndex = parseInt(header.getAttribute('data-display-index'));
        
        // Get the actual column from visible columns
        const visibleColumns = this.table.columnManager.getVisibleColumns(
            this.table.options.columns,
            this.table.columnOrder
        );
        const column = visibleColumns[displayIndex];
        
        if (!column) return;
        
        const colKey = column.key;
        
        // Get current width (use saved width or actual rendered width)
        let currentWidth = this.table.columnWidths[colKey];
        if (!currentWidth || currentWidth < 50) {
            currentWidth = header.offsetWidth || 150; // Fallback to 150px
            // Save initial width if not set
            if (currentWidth >= 50) {
                this.table.columnWidths[colKey] = currentWidth;
            }
        }
        
        this.isResizing = true;
        this.resizeColumnIndex = columnIndex;
        this.dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
        this.dragStartWidth = currentWidth;
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        header.classList.add('resizing');
    }

    handleResize(e) {
        if (!this.isResizing) return;
        
        e.preventDefault();
        const currentX = e.touches ? e.touches[0].clientX : e.clientX;
        const diff = currentX - this.dragStartX;
        const newWidth = Math.max(50, Math.round(this.dragStartWidth + diff)); // Minimum 50px, round to integer
        
        const header = this.table.container.querySelector(`.table-header[data-column="${this.resizeColumnIndex}"]`);
        if (header) {
            const displayIndex = parseInt(header.getAttribute('data-display-index'));
            const visibleColumns = this.table.columnManager.getVisibleColumns(
                this.table.options.columns,
                this.table.columnOrder
            );
            
            if (displayIndex >= 0 && displayIndex < visibleColumns.length) {
                const colKey = visibleColumns[displayIndex].key;
                
                // Save width as number
                this.table.columnWidths[colKey] = newWidth;
                
                // Apply width immediately for visual feedback with !important
                header.style.setProperty('width', `${newWidth}px`, 'important');
                header.style.setProperty('min-width', `${newWidth}px`, 'important');
                header.style.setProperty('max-width', `${newWidth}px`, 'important');
                
                // Update all cells in this column
                const cells = this.table.container.querySelectorAll(`tbody tr td:nth-child(${displayIndex + 1})`);
                cells.forEach(cell => {
                    cell.style.setProperty('width', `${newWidth}px`, 'important');
                    cell.style.setProperty('min-width', `${newWidth}px`, 'important');
                    cell.style.setProperty('max-width', `${newWidth}px`, 'important');
                });
                
                // Recalculate and update table width to prevent column interference
                const table = header.closest('.table-module');
                if (table) {
                    let totalWidth = 0;
                    visibleColumns.forEach(col => {
                        const width = this.table.columnWidths[col.key] || 150;
                        totalWidth += width;
                    });
                    table.style.setProperty('width', `${totalWidth}px`, 'important');
                }
            }
        }
    }

    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            const header = this.table.container.querySelector(`.table-header[data-column="${this.resizeColumnIndex}"]`);
            if (header) {
                header.classList.remove('resizing');
            }
            
            this.table.stateManager.saveState(
                this.table.columnWidths,
                this.table.columnOrder,
                this.table.columnVisibility
            );
            this.table.render(); // Re-render to ensure consistency
        }
    }
}

