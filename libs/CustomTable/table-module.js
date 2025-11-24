class TableModule {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID "${containerId}" not found`);
        }

        const normalizedColumns = this.normalizeColumns(options.columns || []);

        this.options = {
            data: options.data || [],
            columns: normalizedColumns,
            sortable: options.sortable !== false,
            striped: options.striped !== false,
            hover: options.hover !== false,
            responsive: options.responsive !== false,
            ...options
        };

        this.options.columns = normalizedColumns;

        this.sortColumn = null;
        this.sortDirection = 'asc';

        this.init();
    }

    normalizeColumns(columns) {
        return columns.map(col => {
            if (col.column_name) {
                return {
                    key: col.column_name,
                    header: col.column_label || col.column_name,
                    type: col.column_type || 'string',
                    sortable: col.sortable !== false,
                    format: col.format || this.getDefaultFormatter(col.column_type || 'string')
                };
            }
            return {
                key: col.key,
                header: col.header || col.key,
                type: col.type || 'string',
                sortable: col.sortable !== false,
                format: col.format || this.getDefaultFormatter(col.type || 'string')
            };
        });
    }

    getDefaultFormatter(type) {
        const typeLower = (type || 'string').toLowerCase();
        
        switch (typeLower) {
            case 'number':
            case 'integer':
            case 'int':
                return (value) => {
                    if (value === null || value === undefined || value === '') return '';
                    return Number(value).toLocaleString();
                };
            
            case 'currency':
            case 'money':
                return (value) => {
                    if (value === null || value === undefined || value === '') return '';
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(Number(value));
                };
            
            case 'date':
                return (value) => {
                    if (!value) return '';
                    const date = new Date(value);
                    if (isNaN(date.getTime())) return value;
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                };
            
            case 'datetime':
            case 'timestamp':
                return (value) => {
                    if (!value) return '';
                    const date = new Date(value);
                    if (isNaN(date.getTime())) return value;
                    return date.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                };
            
            case 'boolean':
            case 'bool':
                return (value) => {
                    if (value === null || value === undefined) return '';
                    return value ? 'Yes' : 'No';
                };
            
            case 'percentage':
            case 'percent':
                return (value) => {
                    if (value === null || value === undefined || value === '') return '';
                    return `${Number(value).toFixed(2)}%`;
                };
            
            default:
                return null;
        }
    }

    init() {
        this.render();
    }

    render() {
        const tableId = `table-${Date.now()}`;
        this.tableId = tableId;

        let html = '';

        html += `<div class="table-container${this.options.responsive ? ' table-responsive' : ''}">`;
        html += `<table id="${tableId}" class="table-module">`;
        
        html += '<thead><tr>';
        this.options.columns.forEach((column, index) => {
            const sortable = this.options.sortable && column.sortable !== false;
            const sortClass = sortable ? ' sortable' : '';
            const sortIcon = sortable ? '<span class="sort-icon">↕</span>' : '';
            
            html += `<th class="table-header${sortClass}" data-column="${index}">`;
            html += `${column.header || column.key}${sortIcon}`;
            html += '</th>';
        });
        html += '</tr></thead>';

        html += '<tbody>';
        
        if (this.options.data.length === 0) {
            html += `<tr><td colspan="${this.options.columns.length}" class="table-empty">No data available</td></tr>`;
        } else {
            this.options.data.forEach((row, rowIndex) => {
                const rowClass = this.getRowClass(rowIndex);
                html += `<tr class="${rowClass}">`;
                this.options.columns.forEach(column => {
                    const value = this.getCellValue(row, column);
                    html += `<td class="table-cell">${this.formatCell(value, column)}</td>`;
                });
                html += '</tr>';
            });
        }
        html += '</tbody>';
        html += '</table>';
        html += '</div>';

        this.container.innerHTML = html;

        if (this.options.sortable) {
            this.attachSortListeners();
        }
    }


    attachSortListeners() {
        const headers = this.container.querySelectorAll('.sortable');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const columnIndex = parseInt(header.getAttribute('data-column'));
                this.sort(columnIndex);
            });
        });
    }

    sort(columnIndex) {
        const column = this.options.columns[columnIndex];
        
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnIndex;
            this.sortDirection = 'asc';
        }

        this.options.data.sort((a, b) => {
            const aVal = this.getCellValue(a, column);
            const bVal = this.getCellValue(b, column);
            
            const type = (column.type || 'string').toLowerCase();
            let comparison = 0;
            
            if (type === 'number' || type === 'integer' || type === 'int' || type === 'currency' || type === 'money') {
                const aNum = Number(aVal) || 0;
                const bNum = Number(bVal) || 0;
                comparison = aNum - bNum;
            } else if (type === 'date' || type === 'datetime' || type === 'timestamp') {
                const aDate = new Date(aVal);
                const bDate = new Date(bVal);
                comparison = aDate.getTime() - bDate.getTime();
            } else if (type === 'boolean' || type === 'bool') {
                comparison = (aVal ? 1 : 0) - (bVal ? 1 : 0);
            } else {
                const aStr = String(aVal || '').toLowerCase();
                const bStr = String(bVal || '').toLowerCase();
                if (aStr < bStr) comparison = -1;
                if (aStr > bStr) comparison = 1;
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        this.render();
        this.updateSortIcons();
    }

    updateSortIcons() {
        const headers = this.container.querySelectorAll('.table-header');
        headers.forEach((header, index) => {
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (this.sortColumn === index) {
                    icon.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
                } else {
                    icon.textContent = '↕';
                }
            }
        });
    }


    getCellValue(row, column) {
        if (typeof column.key === 'function') {
            return column.key(row);
        }
        const fieldName = column.column_name || column.key;
        return row[fieldName] !== undefined ? row[fieldName] : '';
    }

    formatCell(value, column) {
        if (column.format && typeof column.format === 'function') {
            return column.format(value, column);
        }
        
        const defaultFormatter = this.getDefaultFormatter(column.type);
        if (defaultFormatter) {
            return defaultFormatter(value);
        }
        
        if (typeof value === 'string' && !column.allowHtml) {
            return this.escapeHtml(value);
        }
        
        return value !== null && value !== undefined ? String(value) : '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getRowClass(index) {
        let classes = [];
        if (this.options.striped && index % 2 === 0) {
            classes.push('table-row-striped');
        }
        if (this.options.hover) {
            classes.push('table-row-hover');
        }
        return classes.join(' ');
    }

    updateData(newData) {
        this.options.data = newData;
        this.render();
    }

    updateColumns(newColumns) {
        this.options.columns = this.normalizeColumns(newColumns);
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.render();
    }

    updateColumnsAndData(newColumns, newData) {
        this.options.columns = this.normalizeColumns(newColumns);
        this.options.data = newData;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.render();
    }

    refresh() {
        this.render();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableModule;
}

