/**
 * Column Manager Module
 * Handles column normalization, ordering, and visibility
 */

class ColumnManager {
    constructor(columnVisibility = {}) {
        this.columnVisibility = columnVisibility;
    }

    normalizeColumns(columns, getDefaultFormatter) {
        return columns.map((col, index) => {
            const normalized = col.column_name ? {
                key: col.column_name,
                header: col.column_label || col.column_name,
                type: col.column_type || 'string',
                sortable: col.sortable !== false,
                format: col.format || getDefaultFormatter(col.column_type || 'string'),
                originalIndex: index
            } : {
                key: col.key,
                header: col.header || col.key,
                type: col.type || 'string',
                sortable: col.sortable !== false,
                format: col.format || getDefaultFormatter(col.type || 'string'),
                originalIndex: index
            };
            
            // Apply saved visibility (with safety check)
            const colKey = normalized.key;
            if (this.columnVisibility && this.columnVisibility[colKey] === false) {
                normalized.visible = false;
            } else if (!this.columnVisibility || this.columnVisibility[colKey] === undefined) {
                normalized.visible = col.visible !== false; // Default to visible
            } else {
                normalized.visible = this.columnVisibility[colKey];
            }
            
            return normalized;
        });
    }

    getOrderedColumns(columns, columnOrder) {
        // If we have saved order and it matches the number of columns, use it
        if (columnOrder.length > 0 && columnOrder.length === columns.length) {
            // Map indices to columns, preserving order
            const ordered = [];
            columnOrder.forEach(idx => {
                if (idx >= 0 && idx < columns.length && columns[idx]) {
                    ordered.push(columns[idx]);
                }
            });
            // Add any columns that weren't in the order (in case columns were added)
            columns.forEach((col, idx) => {
                if (!columnOrder.includes(idx)) {
                    ordered.push(col);
                }
            });
            return ordered;
        }
        // Otherwise return columns in original order
        return columns;
    }

    getVisibleColumns(columns, columnOrder) {
        const orderedColumns = this.getOrderedColumns(columns, columnOrder);
        return orderedColumns.filter(col => col.visible !== false);
    }
}

