class TableModule {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with ID "${containerId}" not found`);
        }

        // Initialize column management state BEFORE normalizeColumns
        this.columnWidths = {};
        this.columnOrder = [];
        this.columnVisibility = {};
        this.originalColumnOrder = [];

        // Initialize state manager
        const storageKey = options.storageKey || `table_${containerId}`;
        this.stateManager = new StateManager(storageKey);

        // Load saved state from localStorage (before normalizing columns)
        const savedState = this.stateManager.loadState();
        this.columnWidths = savedState.widths;
        this.columnOrder = savedState.order;
        this.columnVisibility = savedState.visibility;

        // Initialize column manager
        this.columnManager = new ColumnManager(this.columnVisibility);

        // Now normalize columns (can safely access this.columnVisibility)
        const normalizedColumns = this.columnManager.normalizeColumns(
            options.columns || [],
            Formatter.getDefaultFormatter.bind(Formatter)
        );

        // Complete options initialization
        this.options = {
            data: options.data || [],
            columns: normalizedColumns,
            sortable: options.sortable !== false,
            striped: options.striped !== false,
            hover: options.hover !== false,
            responsive: options.responsive !== false,
            resizable: options.resizable !== false,
            reorderable: options.reorderable !== false,
            columnVisibility: options.columnVisibility !== false,
            searchable: options.searchable !== false,
            storageKey: storageKey,
            ...options
        };

        this.options.columns = normalizedColumns;

        // Store original data for filtering
        this.originalData = [...(options.data || [])];
        this.filteredData = [...this.originalData];
        this.searchValues = {};
        this.filterOperations = {}; // Store selected filter operation per column

        // Initialize formatter
        this.formatter = Formatter;

        // Initialize feature modules
        this.sorter = new Sorter(this);
        this.filter = new Filter(this);
        this.resizer = new Resizer(this);
        this.reorderer = new Reorderer(this);
        this.visibilityManager = new VisibilityManager(this);
        this.renderer = new Renderer(this);

        // Initialize original order
        this.originalColumnOrder = this.options.columns.map((col, idx) => idx);

        this.init();
    }

    init() {
        this.render();
    }

    render() {
        this.renderer.render();
    }

    // Public API methods
    updateData(newData) {
        this.originalData = [...newData];
        this.options.data = newData;
        // Reapply filters if searchable is enabled
        if (this.options.searchable) {
            this.filter.applyFilters();
        } else {
            this.filteredData = [...newData];
        }
        this.render();
    }

    updateColumns(newColumns) {
        // Preserve visibility state for existing columns
        const oldColumns = this.options.columns;
        this.options.columns = this.columnManager.normalizeColumns(
            newColumns,
            Formatter.getDefaultFormatter.bind(Formatter)
        );
        
        // Restore visibility from old columns if key matches
        this.options.columns.forEach(newCol => {
            const oldCol = oldColumns.find(col => col.key === newCol.key);
            if (oldCol && oldCol.visible !== undefined) {
                newCol.visible = oldCol.visible;
                this.columnVisibility[newCol.key] = oldCol.visible;
            }
        });
        
        // Update original order
        this.originalColumnOrder = this.options.columns.map((col, idx) => idx);
        
        this.sorter.sortColumn = null;
        this.sorter.sortDirection = 'asc';
        this.render();
    }

    updateColumnsAndData(newColumns, newData) {
        // Preserve visibility state for existing columns
        const oldColumns = this.options.columns;
        this.options.columns = this.columnManager.normalizeColumns(
            newColumns,
            Formatter.getDefaultFormatter.bind(Formatter)
        );
        
        // Restore visibility from old columns if key matches
        this.options.columns.forEach(newCol => {
            const oldCol = oldColumns.find(col => col.key === newCol.key);
            if (oldCol && oldCol.visible !== undefined) {
                newCol.visible = oldCol.visible;
                this.columnVisibility[newCol.key] = oldCol.visible;
            }
        });
        
        this.originalData = [...newData];
        this.options.data = newData;
        
        // Reapply filters if searchable is enabled
        if (this.options.searchable) {
            this.filter.applyFilters();
        } else {
            this.filteredData = [...newData];
        }
        
        // Update original order
        this.originalColumnOrder = this.options.columns.map((col, idx) => idx);
        
        this.sorter.sortColumn = null;
        this.sorter.sortDirection = 'asc';
        this.render();
    }

    refresh() {
        this.render();
    }

    // Expose sorting method for external use
    sort(columnIndex) {
        this.sorter.sort(columnIndex);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableModule;
}
