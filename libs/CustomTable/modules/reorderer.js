/**
 * Reorderer Module
 * Handles column reordering functionality
 */

class Reorderer {
    constructor(tableInstance) {
        this.table = tableInstance;
        this.isDragging = false;
        this.dragColumnIndex = null;
        this.dragStartX = 0;
        this.currentDragX = 0;
    }

    attachReorderListeners() {
        const dragHandles = this.table.container.querySelectorAll('.column-drag-handle');
        dragHandles.forEach((handle) => {
            // Mouse events
            handle.addEventListener('mousedown', (e) => this.startDrag(e, handle));
            
            // Touch events for mobile
            handle.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startDrag(e, handle);
            }, { passive: false });
        });

        // Global mouse/touch move and up events
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.handleDrag(e);
            }
        }, { passive: false });
        document.addEventListener('touchend', () => this.stopDrag());
    }

    startDrag(e, handle) {
        e.preventDefault();
        e.stopPropagation();
        
        const header = handle.closest('.table-header');
        const columnIndex = parseInt(header.getAttribute('data-column'));
        
        this.isDragging = true;
        this.dragColumnIndex = columnIndex;
        this.dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
        
        header.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }

    handleDrag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const currentX = e.touches ? e.touches[0].clientX : e.clientX;
        this.currentDragX = currentX;
        
        const dragHeader = this.table.container.querySelector(`.table-header[data-column="${this.dragColumnIndex}"]`);
        if (dragHeader) {
            const headers = Array.from(this.table.container.querySelectorAll('.table-header'));
            
            // Visual feedback - move the dragged column
            dragHeader.style.opacity = '0.5';
            dragHeader.style.transform = `translateX(${currentX - this.dragStartX}px)`;
            dragHeader.style.zIndex = '1000';
            
            // Highlight drop zone
            headers.forEach((header, idx) => {
                const rect = header.getBoundingClientRect();
                const headerCenter = rect.left + rect.width / 2;
                if (currentX >= rect.left && currentX <= rect.right) {
                    header.classList.add('drop-zone');
                    if (currentX < headerCenter) {
                        header.classList.add('drop-before');
                        header.classList.remove('drop-after');
                    } else {
                        header.classList.add('drop-after');
                        header.classList.remove('drop-before');
                    }
                } else {
                    header.classList.remove('drop-zone', 'drop-before', 'drop-after');
                }
            });
        }
    }

    stopDrag() {
        if (this.isDragging) {
            const dragHeader = this.table.container.querySelector(`.table-header[data-column="${this.dragColumnIndex}"]`);
            const dragDisplayIndex = dragHeader ? parseInt(dragHeader.getAttribute('data-display-index')) : null;
            
            // Clean up visual feedback
            const headers = Array.from(this.table.container.querySelectorAll('.table-header'));
            headers.forEach(header => {
                header.classList.remove('drop-zone', 'drop-before', 'drop-after');
                if (header === dragHeader) {
                    header.classList.remove('dragging');
                    header.style.opacity = '';
                    header.style.transform = '';
                    header.style.zIndex = '';
                }
            });
            
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Calculate new order based on current position
            if (dragDisplayIndex !== null && this.currentDragX) {
                let targetDisplayIndex = null;
                
                headers.forEach((header, idx) => {
                    const rect = header.getBoundingClientRect();
                    if (this.currentDragX >= rect.left && this.currentDragX <= rect.right) {
                        const headerCenter = rect.left + rect.width / 2;
                        targetDisplayIndex = this.currentDragX < headerCenter ? idx : idx + 1;
                    }
                });
                
                if (targetDisplayIndex !== null && targetDisplayIndex !== dragDisplayIndex) {
                    this.reorderColumn(dragDisplayIndex, targetDisplayIndex);
                } else {
                    // No change, just re-render to clean up
                    this.table.render();
                }
            }
            
            this.isDragging = false;
            this.currentDragX = 0;
        }
    }

    reorderColumn(fromIndex, toIndex) {
        const visibleColumns = this.table.columnManager.getVisibleColumns(
            this.table.options.columns,
            this.table.columnOrder
        );
        
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || 
            fromIndex >= visibleColumns.length || toIndex >= visibleColumns.length) {
            return;
        }
        
        // Get original indices
        const fromOriginalIndex = visibleColumns[fromIndex].originalIndex;
        const toOriginalIndex = visibleColumns[toIndex].originalIndex;
        
        // If we don't have a saved order yet, initialize it
        if (this.table.columnOrder.length === 0) {
            this.table.columnOrder = this.table.options.columns.map((col, idx) => idx);
        }
        
        // Find positions in columnOrder array
        const fromPos = this.table.columnOrder.indexOf(fromOriginalIndex);
        const toPos = this.table.columnOrder.indexOf(toOriginalIndex);
        
        if (fromPos !== -1 && toPos !== -1) {
            // Remove from old position
            this.table.columnOrder.splice(fromPos, 1);
            // Insert at new position
            this.table.columnOrder.splice(toPos, 0, fromOriginalIndex);
            
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
        }
    }
}

