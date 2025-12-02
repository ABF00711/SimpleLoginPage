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

        // Set table name for database operations (extract from formName or use containerId)
        const tableName = options.tableName || options.formName || containerId.replace('-table', '').replace('table-', '');
        this.stateManager.setTableName(tableName);
        
        // Initialize with empty state first (will be loaded from database)
        this.columnWidths = {};
        this.columnOrder = [];
        this.columnVisibility = {};
        
        // Initialize column manager with empty visibility (will be updated after loading)
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
        
        // Initialize search state (will be loaded from database)
        this.searchValues = {};
        this.filterOperations = {}; // Store selected filter operation per column

        // Initialize formatter
        this.formatter = Formatter;

        // Initialize feature modules
        this.sorter = new Sorter(this);
        this.filter = new Filter(this);
        
        // Initialize sort state (will be loaded from database)
        this.sorter.sortColumn = null;
        this.sorter.sortDirection = 'asc';
        this.resizer = new Resizer(this);
        this.reorderer = new Reorderer(this);
        this.visibilityManager = new VisibilityManager(this);
        this.renderer = new Renderer(this);
        
        // Initialize column menu
        this.columnMenu = new ColumnMenu(this);
        
        // Initialize column filter state
        this.columnFilters = {}; // Store selected filter values per column
        this.columnFilterSearch = {}; // Store search terms for filter dropdowns
        
        // Set table instance reference for auto-save (after all modules are initialized)
        this.stateManager.setTableInstance(this);

        // Initialize add modal (check if AddModal is available)
        if (typeof AddModal !== 'undefined') {
            this.addModal = new AddModal(this);
            // Set form name if provided in options
            if (options.formName && typeof this.addModal.setFormName === 'function') {
                this.addModal.setFormName(options.formName);
            }
        } else {
            console.warn('AddModal not available. Add functionality will not work.');
            this.addModal = null;
        }
        
        // Initialize selectedRows Set for row selection
        this.selectedRows = new Set();

        // Initialize original order
        this.originalColumnOrder = this.options.columns.map((col, idx) => idx);

        // Load grid_state from database asynchronously, then initialize
        this.loadGridState().then(() => {
            this.init();
        }).catch((error) => {
            console.error('Failed to load grid_state:', error);
            // Initialize anyway with default state
        this.init();
        });
    }

    async loadGridState() {
        // Load saved layout state from database
        const savedLayoutState = await this.stateManager.loadLayoutState();
        this.columnWidths = savedLayoutState.widths || {};
        this.columnOrder = savedLayoutState.order || [];
        
        // Ensure visibility is an object, not an array
        const loadedVisibility = savedLayoutState.visibility || {};
        if (Array.isArray(loadedVisibility)) {
            this.columnVisibility = {};
        } else if (typeof loadedVisibility === 'object') {
            this.columnVisibility = loadedVisibility;
        } else {
            this.columnVisibility = {};
        }
        
        // Update column manager with loaded visibility
        this.columnManager = new ColumnManager(this.columnVisibility);
        
        // Re-normalize columns with loaded visibility
        this.options.columns = this.columnManager.normalizeColumns(
            this.options.columns,
            Formatter.getDefaultFormatter.bind(Formatter)
        );
        
        // Ensure all columns have visibility set correctly based on loaded state
        this.options.columns.forEach(column => {
            const colKey = column.key;
            if (this.columnVisibility.hasOwnProperty(colKey)) {
                column.visible = this.columnVisibility[colKey] !== false;
            }
        });
        
        // Load saved search pattern state from database
        const savedSearchPatternState = await this.stateManager.loadSearchPatternState();
        
        // Initialize search state (load from saved state if available)
        this.searchValues = savedSearchPatternState.searchValues || {};
        this.filterOperations = savedSearchPatternState.filterOperations || {};
        
        // Initialize sort state (load from saved state if available) - must be after sorter initialization
        this.sorter.sortColumn = savedSearchPatternState.sortColumn || null;
        this.sorter.sortDirection = savedSearchPatternState.sortDirection || 'asc';
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

    /**
     * Auto-save current grid_state to database
     * Called by modules when state changes (width, order, visibility, sort, filter)
     */
    autoSaveGridState() {
        // Ensure searchValues and filterOperations are objects (not arrays)
        const searchValues = (this.searchValues && typeof this.searchValues === 'object' && !Array.isArray(this.searchValues)) 
            ? this.searchValues 
            : {};
        const filterOperations = (this.filterOperations && typeof this.filterOperations === 'object' && !Array.isArray(this.filterOperations)) 
            ? this.filterOperations 
            : {};
        
        // Ensure columnVisibility is an object (not an array)
        const columnVisibility = (this.columnVisibility && typeof this.columnVisibility === 'object' && !Array.isArray(this.columnVisibility)) 
            ? this.columnVisibility 
            : {};
        
        this.stateManager.autoSaveGridState(
            this.columnWidths,
            this.columnOrder,
            columnVisibility,
            this.sorter.sortColumn,
            this.sorter.sortDirection,
            searchValues,
            filterOperations
        );
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
        // Update status bar after render (render already calls it, but ensure it's updated)
        if (this.renderer) {
            setTimeout(() => this.renderer.updateStatusBar(), 0);
        }
        
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
