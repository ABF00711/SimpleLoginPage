/**
 * Sorter Module
 * Handles column sorting functionality
 */

class Sorter {
    constructor(tableInstance) {
        this.table = tableInstance;
        this.sortColumn = null;
        this.sortDirection = 'asc';
    }

    sort(columnIndex) {
        // Find column by original index (accounting for visibility)
        const column = this.table.options.columns[columnIndex];
        if (!column) return;
        
        if (this.sortColumn === columnIndex) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnIndex;
            this.sortDirection = 'asc';
        }

        // Sort the data that's being displayed (filteredData if searchable, otherwise options.data)
        const dataToSort = this.table.options.searchable ? this.table.filteredData : this.table.options.data;
        
        dataToSort.sort((a, b) => {
            const aVal = this.table.formatter.getCellValue(a, column);
            const bVal = this.table.formatter.getCellValue(b, column);
            
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

        this.table.render();
        this.updateSortIcons();
    }

    updateSortIcons() {
        const headers = this.table.container.querySelectorAll('.table-header');
        headers.forEach((header) => {
            const columnIndex = parseInt(header.getAttribute('data-column'));
            const icon = header.querySelector('.sort-icon');
            if (icon) {
                if (this.sortColumn === columnIndex) {
                    icon.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
                } else {
                    icon.textContent = '↕';
                }
            }
        });
    }

    attachSortListeners() {
        const headers = this.table.container.querySelectorAll('.sortable');
        headers.forEach(header => {
            const headerContent = header.querySelector('.header-content');
            if (headerContent) {
                headerContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const columnIndex = parseInt(header.getAttribute('data-column'));
                    this.sort(columnIndex);
                });
            }
        });
    }
}

