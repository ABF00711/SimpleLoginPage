# Modular Architecture

The Table Module has been refactored into a modular architecture for better maintainability and scalability.

## Module Structure

```
libs/CustomTable/
├── modules/
│   ├── formatter.js          # Cell formatting and value extraction
│   ├── column-manager.js     # Column normalization and management
│   ├── state-manager.js      # LocalStorage persistence
│   ├── filter.js             # Search/filtering functionality
│   ├── sorter.js             # Column sorting
│   ├── resizer.js            # Column resizing
│   ├── reorderer.js          # Column reordering
│   ├── visibility-manager.js # Column visibility
│   └── renderer.js           # Table rendering logic
└── table-module.js           # Main class (orchestrates modules)
```

## Module Descriptions

### 1. Formatter (`modules/formatter.js`)
- **Purpose**: Handles cell value formatting and extraction
- **Methods**:
  - `getDefaultFormatter(type)` - Returns formatter function for a data type
  - `getCellValue(row, column)` - Extracts cell value from row data
  - `formatCell(value, column)` - Formats a cell value for display
  - `escapeHtml(text)` - Escapes HTML in text

### 2. Column Manager (`modules/column-manager.js`)
- **Purpose**: Manages column normalization, ordering, and visibility
- **Methods**:
  - `normalizeColumns(columns, getDefaultFormatter)` - Normalizes column definitions
  - `getOrderedColumns(columns, columnOrder)` - Returns columns in saved order
  - `getVisibleColumns(columns, columnOrder)` - Returns only visible columns

### 3. State Manager (`modules/state-manager.js`)
- **Purpose**: Handles localStorage persistence
- **Methods**:
  - `saveState(columnWidths, columnOrder, columnVisibility)` - Saves state to localStorage
  - `loadState()` - Loads state from localStorage

### 4. Filter (`modules/filter.js`)
- **Purpose**: Handles search/filtering functionality
- **Methods**:
  - `getInputTypeForColumn(columnType)` - Returns appropriate input type
  - `getInputAttributesForColumn(columnType)` - Returns input attributes
  - `applyFilters()` - Applies filters to data
  - `attachSearchListeners()` - Attaches event listeners to search inputs

### 5. Sorter (`modules/sorter.js`)
- **Purpose**: Handles column sorting
- **Methods**:
  - `sort(columnIndex)` - Sorts data by column
  - `updateSortIcons()` - Updates sort icons in headers
  - `attachSortListeners()` - Attaches click listeners to sortable headers

### 6. Resizer (`modules/resizer.js`)
- **Purpose**: Handles column resizing
- **Methods**:
  - `startResize(e, handle)` - Initiates resize operation
  - `handleResize(e)` - Handles resize during drag
  - `stopResize()` - Completes resize operation
  - `attachResizeListeners()` - Attaches resize listeners

### 7. Reorderer (`modules/reorderer.js`)
- **Purpose**: Handles column reordering
- **Methods**:
  - `startDrag(e, handle)` - Initiates drag operation
  - `handleDrag(e)` - Handles drag during move
  - `stopDrag()` - Completes drag operation
  - `reorderColumn(fromIndex, toIndex)` - Reorders columns
  - `attachReorderListeners()` - Attaches reorder listeners

### 8. Visibility Manager (`modules/visibility-manager.js`)
- **Purpose**: Handles column visibility
- **Methods**:
  - `toggleColumnVisibility(colKey)` - Toggles column visibility
  - `attachVisibilityListeners()` - Attaches visibility toggle listeners
  - `attachHiddenColumnsMenu()` - Attaches hidden columns menu listeners

### 9. Renderer (`modules/renderer.js`)
- **Purpose**: Handles table rendering
- **Methods**:
  - `render()` - Main render method
  - `renderHiddenColumnsMenu(hiddenColumns)` - Renders hidden columns menu
  - `calculateColumnWidths(visibleColumns)` - Calculates column widths
  - `renderHeader(visibleColumns, columnWidthsMap)` - Renders table header
  - `renderBody(visibleColumns, columnWidthsMap)` - Renders table body
  - `renderSearchRow(visibleColumns, columnWidthsMap)` - Renders search row
  - `renderDataRow(row, rowIndex, visibleColumns, columnWidthsMap)` - Renders data row
  - `getRowClass(index)` - Returns CSS classes for row
  - `attachEventListeners()` - Attaches all event listeners

## Usage

### Loading Modules

Load all modules in the correct order before the main `table-module.js`:

```html
<!-- Load modules in order -->
<script src="modules/formatter.js"></script>
<script src="modules/column-manager.js"></script>
<script src="modules/state-manager.js"></script>
<script src="modules/filter.js"></script>
<script src="modules/sorter.js"></script>
<script src="modules/resizer.js"></script>
<script src="modules/reorderer.js"></script>
<script src="modules/visibility-manager.js"></script>
<script src="modules/renderer.js"></script>
<script src="table-module.js"></script>
```

### Using the Table Module

The public API remains the same:

```javascript
const table = new TableModule('my-table', {
    data: [...],
    columns: [...],
    sortable: true,
    resizable: true,
    reorderable: true,
    columnVisibility: true,
    searchable: true
});

// Public methods still work
table.updateData(newData);
table.updateColumns(newColumns);
table.updateColumnsAndData(newColumns, newData);
table.refresh();
table.sort(columnIndex);
```

## Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Scalability**: Easy to add new features by creating new modules
3. **Testability**: Modules can be tested independently
4. **Reusability**: Modules can be reused in other projects
5. **Readability**: Smaller, focused files are easier to understand

## Module Dependencies

```
table-module.js
├── depends on: StateManager, ColumnManager, Formatter
├── initializes: Sorter, Filter, Resizer, Reorderer, VisibilityManager, Renderer
└── Renderer depends on: all other modules (via table instance)
```

## Future Enhancements

With this modular structure, you can easily:
- Add new features (e.g., export module, pagination module)
- Replace implementations (e.g., different state storage)
- Create plugin system
- Add unit tests for each module
- Optimize individual modules

