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
                    
                    // Handle invalid MySQL dates like "0000-00-00"
                    if (typeof value === 'string' && (value === '0000-00-00' || value.startsWith('0000-'))) {
                        return '';
                    }
                    
                    let date;
                    
                    // If it's a string in YYYY-MM-DD format, parse as LOCAL date to avoid UTC timezone issues
                    if (typeof value === 'string') {
                        const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
                        if (isoMatch) {
                            const year = parseInt(isoMatch[1], 10);
                            const month = parseInt(isoMatch[2], 10);
                            const day = parseInt(isoMatch[3], 10);
                            
                            // Validate date components - reject invalid dates
                            if (year === 0 || month === 0 || day === 0 || month > 12 || day > 31) {
                                return '';
                            }
                            
                            // Parse as local date by creating Date with explicit components
                            // This avoids UTC interpretation: new Date('2024-01-15') interprets as UTC
                            date = new Date(year, month - 1, day);
                        } else {
                            // For other date string formats, try standard parsing
                            date = new Date(value);
                        }
                    } else if (value instanceof Date) {
                        date = value;
                    } else {
                        date = new Date(value);
                    }
                    
                    // Check if date is valid
                    if (isNaN(date.getTime())) return '';
                    
                    // Additional check: if year is 0 or negative, it's invalid
                    if (date.getFullYear() <= 0) return '';
                    
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric'
                    });
                };
            
            case 'datetime':
            case 'timestamp':
                return (value) => {
                    if (!value) return '';
                    
                    let date;
                    
                    // If it's a string in YYYY-MM-DD format (date only), parse as LOCAL date
                    if (typeof value === 'string') {
                        const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                        if (isoDateMatch) {
                            // Parse as local date to avoid UTC timezone issues
                            date = new Date(
                                parseInt(isoDateMatch[1], 10),      // Year
                                parseInt(isoDateMatch[2], 10) - 1,  // Month (0-indexed)
                                parseInt(isoDateMatch[3], 10)       // Day
                            );
                        } else {
                            // For datetime strings (with time), use standard parsing
                            date = new Date(value);
                        }
                    } else if (value instanceof Date) {
                        date = value;
                    } else {
                        date = new Date(value);
                    }
                    
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

