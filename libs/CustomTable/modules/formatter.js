/**
 * Formatter Module
 * Handles cell value formatting and extraction
 */

class Formatter {
    static getDefaultFormatter(type) {
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

    static getCellValue(row, column) {
        if (typeof column.key === 'function') {
            return column.key(row);
        }
        const fieldName = column.column_name || column.key;
        return row[fieldName] !== undefined ? row[fieldName] : '';
    }

    static formatCell(value, column) {
        if (column.format && typeof column.format === 'function') {
            return column.format(value, column);
        }
        
        const defaultFormatter = Formatter.getDefaultFormatter(column.type);
        if (defaultFormatter) {
            return defaultFormatter(value);
        }
        
        if (typeof value === 'string' && !column.allowHtml) {
            return Formatter.escapeHtml(value);
        }
        
        return value !== null && value !== undefined ? String(value) : '';
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

