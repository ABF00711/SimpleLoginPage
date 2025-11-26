/**
 * Renderer Module
 * Handles table rendering logic
 */

class Renderer {
    constructor(tableInstance) {
        this.table = tableInstance;
    }

    render() {
        const tableId = `table-${Date.now()}`;
        this.table.tableId = tableId;

        // Apply column order
        const orderedColumns = this.table.columnManager.getOrderedColumns(
            this.table.options.columns,
            this.table.columnOrder
        );
        const visibleColumns = this.table.columnManager.getVisibleColumns(
            this.table.options.columns,
            this.table.columnOrder
        );
        const hiddenColumns = orderedColumns.filter(col => col.visible === false);

        let html = '';

        // Show columns dropdown button if column visibility is enabled
        if (this.table.options.columnVisibility) {
            html += this.renderHiddenColumnsMenu(orderedColumns);
        }

        // Calculate column widths if resizable
        const { columnWidthsMap, totalColumnWidth } = this.calculateColumnWidths(visibleColumns);

        // Use fixed layout if resizable is enabled
        const useFixedLayout = this.table.options.resizable;
        const tableLayout = useFixedLayout ? 'table-layout: fixed;' : '';
        
        // Set table width
        const tableWidth = this.getTableWidth(totalColumnWidth);
        
        html += `<div class="table-container${this.table.options.responsive ? ' table-responsive' : ''}">`;
        html += `<table id="${tableId}" class="table-module" style="${tableLayout} ${tableWidth}">`;
        
        // Render header
        html += this.renderHeader(visibleColumns, columnWidthsMap);
        
        // Render body
        html += this.renderBody(visibleColumns, columnWidthsMap);
        
        html += '</table>';
        html += '</div>';

        this.table.container.innerHTML = html;

        // Smart UI elements auto-upgrade, but ensure they're ready
        requestAnimationFrame(() => {
            // Attach event listeners after DOM is ready
            this.attachEventListeners();
        });
    }

    renderHiddenColumnsMenu(allColumns) {
        let html = '<div class="hidden-columns-menu">';
        html += '<smart-button class="show-columns-btn" title="Show/Hide columns">';
        html += '<span class="show-columns-icon">👁</span>';
        html += '<span class="show-columns-text">Hide</span>';
        html += '</smart-button>';
        html += '<div class="hidden-columns-dropdown">';
        
        // Render all columns with checkboxes
        allColumns.forEach(column => {
            const colKey = column.key;
            const isVisible = column.visible !== false;
            const checkedClass = isVisible ? ' checked' : '';
            html += `<div class="hidden-column-item${checkedClass}" data-column-key="${colKey}">`;
            html += `<span class="hidden-column-checkbox${checkedClass}">${isVisible ? '✓' : ''}</span>`;
            html += `<span class="hidden-column-label">${column.header || column.key}</span>`;
            html += '</div>';
        });
        
        // Add Reset button
        html += '<div class="hidden-columns-divider"></div>';
        html += '<div class="hidden-column-reset" data-action="reset">';
        html += '<span class="hidden-column-reset-icon">↻</span>';
        html += '<span class="hidden-column-reset-label">Reset</span>';
        html += '</div>';
        
        html += '</div>';
        html += '</div>';
        return html;
    }

    calculateColumnWidths(visibleColumns) {
        const columnWidthsMap = {};
        let totalColumnWidth = 0;
        
        if (this.table.options.resizable) {
            visibleColumns.forEach((column) => {
                const colKey = column.key;
                let width = this.table.columnWidths[colKey];
                // Ensure width is a valid number
                if (width === undefined || width === null || isNaN(width) || width < 50) {
                    width = 150; // Default 150px if not set or invalid
                } else {
                    width = Number(width); // Ensure it's a number
                }
                columnWidthsMap[colKey] = width;
                totalColumnWidth += width;
            });
        }
        
        return { columnWidthsMap, totalColumnWidth };
    }

    getTableWidth(totalColumnWidth) {
        if (this.table.options.resizable && totalColumnWidth > 0) {
            return `width: ${totalColumnWidth}px;`;
        } else {
            return 'width: 100%;';
        }
    }

    renderHeader(visibleColumns, columnWidthsMap) {
        let html = '<thead><tr>';
        
        visibleColumns.forEach((column, displayIndex) => {
            const originalIndex = column.originalIndex;
            const sortable = this.table.options.sortable && column.sortable !== false;
            const sortClass = sortable ? ' sortable' : '';
            const sortIcon = sortable ? '<span class="sort-icon">↕</span>' : '';
            
            const colKey = column.key;
            let widthStyle = '';
            if (this.table.options.resizable) {
                const width = columnWidthsMap[colKey] || 150;
                widthStyle = `width: ${width}px !important; min-width: ${width}px !important; max-width: ${width}px !important;`;
            }
            
            html += `<th class="table-header${sortClass}" data-column="${originalIndex}" data-display-index="${displayIndex}" style="${widthStyle}">`;
            html += '<div class="table-header-inner">';
            
            // Drag handle for reordering
            if (this.table.options.reorderable) {
                html += '<span class="column-drag-handle" title="Drag to reorder">⋮⋮</span>';
            }
            
            // Header content
            html += '<span class="header-content">';
            html += `${column.header || column.key}${sortIcon}`;
            html += '</span>';
            
            html += '</div>';
            
            // Resize handle
            if (this.table.options.resizable) {
                html += '<span class="column-resize-handle" title="Drag to resize"></span>';
            }
            
            html += '</th>';
        });
        
        html += '</tr></thead>';
        return html;
    }

    renderBody(visibleColumns, columnWidthsMap) {
        let html = '<tbody>';
        
        // Add search row if searchable is enabled
        if (this.table.options.searchable) {
            html += this.renderSearchRow(visibleColumns, columnWidthsMap);
        }
        
        // Use filteredData if searchable is enabled, otherwise use options.data
        const dataToRender = this.table.options.searchable ? this.table.filteredData : this.table.options.data;
        
        if (dataToRender.length === 0) {
            html += `<tr><td colspan="${visibleColumns.length}" class="table-empty">No data available</td></tr>`;
        } else {
            dataToRender.forEach((row, rowIndex) => {
                html += this.renderDataRow(row, rowIndex, visibleColumns, columnWidthsMap);
            });
        }
        
        html += '</tbody>';
        return html;
    }

    renderSearchRow(visibleColumns, columnWidthsMap) {
        let html = '<tr class="table-search-row">';
        
        visibleColumns.forEach((column, displayIndex) => {
            const colKey = column.key;
            const searchValue = this.table.searchValues[colKey] || '';
            const currentOperation = this.table.filterOperations[colKey] || 
                                    this.table.filter.getDefaultOperationForColumnType(column.type);
            const operations = this.table.filter.getOperationsForColumnType(column.type);
            const inputType = this.table.filter.getInputTypeForColumn(column.type);
            const inputAttrs = this.table.filter.getInputAttributesForColumn(column.type);
            let widthStyle = '';
            if (this.table.options.resizable) {
                const width = columnWidthsMap[colKey] || 150;
                widthStyle = `width: ${width}px !important; min-width: ${width}px !important; max-width: ${width}px !important;`;
            }
            
            html += `<td class="table-search-cell" style="${widthStyle}">`;
            html += '<div class="table-search-input-wrapper">';
            // Add filter operation selector
            html += '<button type="button" class="filter-operation-btn" data-column-key="' + colKey + '" title="Filter operation">';
            html += '<span class="filter-operation-icon">⋮</span>';
            html += '</button>';
            html += '<div class="filter-operation-dropdown" data-column-key="' + colKey + '">';
            operations.forEach(op => {
                const selected = currentOperation === op.value ? ' selected' : '';
                html += `<div class="filter-operation-item${selected}" data-operation="${op.value}" data-column-key="${colKey}">${op.label}</div>`;
            });
            html += '</div>';
            
            if (column.type === 'boolean') {
                html += `<select class="table-search-input" data-column-key="${colKey}" title="Search ${column.header}">`;
                html += `<option value="">All</option>`;
                html += `<option value="true"${searchValue === 'true' ? ' selected' : ''}>True</option>`;
                html += `<option value="false"${searchValue === 'false' ? ' selected' : ''}>False</option>`;
                html += `</select>`;
            } else {
                html += `<input type="${inputType}" class="table-search-input" data-column-key="${colKey}" value="${this.table.formatter.escapeHtml(searchValue)}" placeholder="Search..." title="Search ${column.header}" ${inputAttrs}>`;
            }
            
            
            html += '</div>';
            html += '</td>';
        });
        
        html += '</tr>';
        return html;
    }

    renderDataRow(row, rowIndex, visibleColumns, columnWidthsMap) {
        const rowClass = this.getRowClass(rowIndex);
        let html = `<tr class="${rowClass}">`;
        
        visibleColumns.forEach(column => {
            const value = this.table.formatter.getCellValue(row, column);
            let widthStyle = '';
            if (this.table.options.resizable) {
                const width = columnWidthsMap[column.key] || 150;
                widthStyle = `width: ${width}px !important; min-width: ${width}px !important; max-width: ${width}px !important;`;
            }
            html += `<td class="table-cell" style="${widthStyle}">${this.table.formatter.formatCell(value, column)}</td>`;
        });
        
        html += '</tr>';
        return html;
    }

    getRowClass(index) {
        let classes = [];
        if (this.table.options.striped && index % 2 === 0) {
            classes.push('table-row-striped');
        }
        if (this.table.options.hover) {
            classes.push('table-row-hover');
        }
        return classes.join(' ');
    }

    attachEventListeners() {
        if (this.table.options.sortable) {
            this.table.sorter.attachSortListeners();
        }
        if (this.table.options.resizable) {
            this.table.resizer.attachResizeListeners();
        }
        if (this.table.options.reorderable) {
            this.table.reorderer.attachReorderListeners();
        }
        if (this.table.options.columnVisibility) {
            this.table.visibilityManager.attachHiddenColumnsMenu();
        }
        if (this.table.options.searchable) {
            this.table.filter.attachSearchListeners();
        }
    }

    /**
     * Updates only the data rows without re-rendering the search row
     * This preserves focus on search inputs during filtering
     */
    updateDataRows() {
        const tbody = this.table.container.querySelector('tbody');
        if (!tbody) return;

        // Get visible columns
        const visibleColumns = this.table.columnManager.getVisibleColumns(
            this.table.options.columns,
            this.table.columnOrder
        );

        // Calculate column widths if resizable
        const { columnWidthsMap } = this.calculateColumnWidths(visibleColumns);

        // Find the search row (if it exists)
        const searchRow = tbody.querySelector('.table-search-row');
        
        // Get all data rows (excluding search row)
        const existingDataRows = Array.from(tbody.querySelectorAll('tr:not(.table-search-row)'));
        
        // Use filteredData if searchable is enabled, otherwise use options.data
        const dataToRender = this.table.options.searchable ? this.table.filteredData : this.table.options.data;

        // Remove existing data rows
        existingDataRows.forEach(row => row.remove());

        // Add new data rows
        if (dataToRender.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="${visibleColumns.length}" class="table-empty">No data available</td>`;
            if (searchRow) {
                // Insert after search row
                searchRow.insertAdjacentElement('afterend', emptyRow);
            } else {
                tbody.appendChild(emptyRow);
            }
        } else {
            // Create a document fragment for better performance
            const fragment = document.createDocumentFragment();
            
            // Use a temporary tbody to parse tr elements (tr can't be child of div)
            const tempTbody = document.createElement('tbody');
            
            dataToRender.forEach((row, rowIndex) => {
                const rowHtml = this.renderDataRow(row, rowIndex, visibleColumns, columnWidthsMap);
                tempTbody.innerHTML = rowHtml;
                const newRow = tempTbody.firstElementChild;
                
                if (!newRow) {
                    console.warn('Failed to parse row HTML:', rowHtml);
                    return;
                }
                
                // Remove from tempTbody and add to fragment
                tempTbody.removeChild(newRow);
                fragment.appendChild(newRow);
            });
            
            // Insert all rows at once after search row
            if (searchRow) {
                // insertAdjacentElement doesn't work with DocumentFragment, so we need to insert after
                const nextSibling = searchRow.nextSibling;
                if (nextSibling) {
                    tbody.insertBefore(fragment, nextSibling);
                } else {
                    // If no next sibling, append to tbody (will be after search row)
                    tbody.appendChild(fragment);
                }
            } else {
                tbody.appendChild(fragment);
            }
        }
    }
}

