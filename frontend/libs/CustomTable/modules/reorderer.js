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
            // Only consider data column headers (exclude checkbox and action columns)
            const dataHeaders = headers.filter(header => {
                const colIndex = header.getAttribute('data-column');
                return colIndex !== null && !header.classList.contains('table-checkbox-header') && !header.classList.contains('table-action-header');
            });
            
            if (dragDisplayIndex !== null && this.currentDragX) {
                let targetDisplayIndex = null;
                
                dataHeaders.forEach((header, idx) => {
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
        // Initialize columnOrder if needed
        if (this.table.columnOrder.length === 0 || this.table.columnOrder.length !== this.table.options.columns.length) {
            this.table.columnOrder = this.table.options.columns.map((col, idx) => idx);
        }
        
        // Get ordered columns (including hidden ones) to maintain full order
        const orderedColumns = this.table.columnManager.getOrderedColumns(
            this.table.options.columns,
            this.table.columnOrder
        );
        
        // Get visible columns for index mapping
        const visibleColumns = orderedColumns.filter(col => col.visible !== false);
        
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || 
            fromIndex >= visibleColumns.length || toIndex >= visibleColumns.length) {
            return;
        }
        
        // Get the original index of the column being moved
        const fromOriginalIndex = visibleColumns[fromIndex].originalIndex;
        
        // Find the position of the source column in the ordered list
        const fromPosInOrdered = orderedColumns.findIndex(col => col.originalIndex === fromOriginalIndex);
        if (fromPosInOrdered === -1) {
            return; // Column not found
        }
        
        // Determine target position in the ordered list
        let targetPosInOrdered = -1;
        if (toIndex === 0) {
            // Moving to first visible position - insert before first visible column
            const firstVisible = visibleColumns[0];
            targetPosInOrdered = orderedColumns.findIndex(col => col.originalIndex === firstVisible.originalIndex);
        } else if (toIndex >= visibleColumns.length) {
            // Moving to last visible position - insert after last visible column
            const lastVisible = visibleColumns[visibleColumns.length - 1];
            const lastVisiblePos = orderedColumns.findIndex(col => col.originalIndex === lastVisible.originalIndex);
            targetPosInOrdered = lastVisiblePos + 1;
        } else {
            // Moving between two visible columns - insert before the target visible column
            const targetVisibleColumn = visibleColumns[toIndex];
            targetPosInOrdered = orderedColumns.findIndex(col => col.originalIndex === targetVisibleColumn.originalIndex);
        }
        
        if (targetPosInOrdered === -1) {
            return; // Target position not found
        }
        
        // Update columnOrder array
        // Remove from old position
        this.table.columnOrder.splice(fromPosInOrdered, 1);
        
        // Adjust target position if we removed before the target
        const adjustedTargetPos = fromPosInOrdered < targetPosInOrdered ? targetPosInOrdered - 1 : targetPosInOrdered;
        
        // Insert at new position
        this.table.columnOrder.splice(adjustedTargetPos, 0, fromOriginalIndex);
        
        // Trigger auto-save and re-render
        this.table.autoSaveGridState();
        this.table.render();
    }
}

