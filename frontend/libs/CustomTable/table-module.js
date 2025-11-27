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

        // Load saved layout state from localStorage (before normalizing columns)
        const savedLayoutState = this.stateManager.loadLayoutState();
        this.columnWidths = savedLayoutState.widths;
        this.columnOrder = savedLayoutState.order;
        this.columnVisibility = savedLayoutState.visibility;
        
        // Load saved search pattern state from localStorage
        const savedSearchPatternState = this.stateManager.loadSearchPatternState();

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
        
        // Initialize search state (load from saved state if available)
        this.searchValues = savedSearchPatternState.searchValues || {};
        this.filterOperations = savedSearchPatternState.filterOperations || {}; // Store selected filter operation per column

        // Initialize formatter
        this.formatter = Formatter;

        // Initialize feature modules
        this.sorter = new Sorter(this);
        this.filter = new Filter(this);
        
        // Initialize sort state (load from saved state if available) - must be after sorter initialization
        this.sorter.sortColumn = savedSearchPatternState.sortColumn || null;
        this.sorter.sortDirection = savedSearchPatternState.sortDirection || 'asc';
        this.resizer = new Resizer(this);
        this.reorderer = new Reorderer(this);
        this.visibilityManager = new VisibilityManager(this);
        this.renderer = new Renderer(this);
        
        // Initialize selectedRows Set for row selection
        this.selectedRows = new Set();

        // Initialize original order
        this.originalColumnOrder = this.options.columns.map((col, idx) => idx);

        this.init();
    }

    init() {
        this.render();
        
        // Apply saved search pattern after render
        if (this.options.searchable) {
            // Apply filters if there are saved search values
            if (Object.keys(this.searchValues).length > 0) {
                this.filter.applyFilters();
                this.renderer.updateDataRows();
            }
            
            // Apply sort if there's a saved sort column
            if (this.sorter.sortColumn !== null) {
                // Sort will be applied when render completes
                // Use preserveDirection=true to keep the saved direction (don't toggle)
                setTimeout(() => {
                    this.sorter.sort(this.sorter.sortColumn, true);
                }, 0);
            }
        }
    }

    render() {
        this.renderer.render();
    }

    // Public API methods
    updateData(newData) {
        // Save current sort state before updating
        const savedSortColumn = this.sorter.sortColumn;
        const savedSortDirection = this.sorter.sortDirection;
        
        this.originalData = [...newData];
        this.options.data = newData;
        // Reapply filters if searchable is enabled
        if (this.options.searchable) {
            this.filter.applyFilters();
        } else {
            this.filteredData = [...newData];
        }
        this.render();
        
        // Reapply sort state after render (similar to init method)
        // Sort should be applied regardless of searchable option
        if (savedSortColumn !== null && this.options.sortable) {
            setTimeout(() => {
                // Restore sort direction and apply sort
                this.sorter.sortColumn = savedSortColumn;
                this.sorter.sortDirection = savedSortDirection;
                this.sorter.sort(savedSortColumn, true);
            }, 0);
        }
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

// Expose to global scope for script tag usage
if (typeof window !== 'undefined') {
    window.TableModule = TableModule;
}

// Expose to CommonJS for Node.js/require
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableModule;
}
