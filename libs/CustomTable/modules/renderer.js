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

        // Show hidden columns dropdown if there are hidden columns
        if (this.table.options.columnVisibility && hiddenColumns.length > 0) {
            html += this.renderHiddenColumnsMenu(hiddenColumns);
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

        // Attach event listeners
        this.attachEventListeners();
    }

    renderHiddenColumnsMenu(hiddenColumns) {
        let html = '<div class="hidden-columns-menu">';
        html += '<button class="show-columns-btn" type="button" title="Show hidden columns">';
        html += '<span>👁️</span> Show Columns (' + hiddenColumns.length + ')';
        html += '</button>';
        html += '<div class="hidden-columns-dropdown">';
        hiddenColumns.forEach(column => {
            const colKey = column.key;
            html += `<div class="hidden-column-item" data-column-key="${colKey}">`;
            html += `<span class="hidden-column-checkbox">✓</span>`;
            html += `<span class="hidden-column-label">${column.header || column.key}</span>`;
            html += '</div>';
        });
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
            
            // Eye icon for visibility
            if (this.table.options.columnVisibility) {
                const hiddenClass = column.visible === false ? ' hidden' : '';
                html += `<span class="column-visibility-toggle${hiddenClass}" data-column-key="${colKey}" title="Toggle visibility"></span>`;
            }
            
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
            const inputType = this.table.filter.getInputTypeForColumn(column.type);
            const inputAttrs = this.table.filter.getInputAttributesForColumn(column.type);
            let widthStyle = '';
            if (this.table.options.resizable) {
                const width = columnWidthsMap[colKey] || 150;
                widthStyle = `width: ${width}px !important; min-width: ${width}px !important; max-width: ${width}px !important;`;
            }
            
            html += `<td class="table-search-cell" style="${widthStyle}">`;
            if (column.type === 'boolean') {
                html += `<select class="table-search-input" data-column-key="${colKey}" title="Search ${column.header}">`;
                html += `<option value="">All</option>`;
                html += `<option value="true"${searchValue === 'true' ? ' selected' : ''}>True</option>`;
                html += `<option value="false"${searchValue === 'false' ? ' selected' : ''}>False</option>`;
                html += `</select>`;
            } else {
                html += `<input type="${inputType}" class="table-search-input" data-column-key="${colKey}" value="${this.table.formatter.escapeHtml(searchValue)}" placeholder="Search..." title="Search ${column.header}" ${inputAttrs}>`;
            }
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
            this.table.visibilityManager.attachVisibilityListeners();
            this.table.visibilityManager.attachHiddenColumnsMenu();
        }
        if (this.table.options.searchable) {
            this.table.filter.attachSearchListeners();
        }
    }
}

