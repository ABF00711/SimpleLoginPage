# Table Module

A lightweight, dependency-free, reusable table component built with HTML, CSS, and vanilla JavaScript. Perfect for PHP projects, vanilla JS applications, and any web project that needs a feature-rich data table.

## Features

- ✅ **Sortable columns** - Click headers to sort ascending/descending
- ✅ **Responsive design** - Works on mobile and desktop
- ✅ **Custom formatting** - Format cells with custom functions
- ✅ **Dynamic columns** - Support for column_name, column_label, column_type
- ✅ **Type-aware sorting** - Automatic sorting based on data types
- ✅ **No dependencies** - Pure vanilla JavaScript
- ✅ **Easy integration** - Works with PHP, vanilla JS, and frameworks
- ✅ **Modern styling** - Clean, professional appearance
- ✅ **Dark mode support** - Automatic dark mode detection

## Quick Start

### 1. Include Files

Add the CSS and JavaScript files to your HTML:

```html
<link rel="stylesheet" href="table-module.css">
<script src="table-module.js"></script>
```

### 2. Create Container

Add a container div where you want the table:

```html
<div id="my-table"></div>
```

### 3. Initialize Table

```javascript
const table = new TableModule('my-table', {
    data: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ],
    columns: [
        { key: 'id', header: 'ID' },
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' }
    ]
});
```

## Configuration Options

```javascript
const table = new TableModule('container-id', {
    // Required
    data: [],              // Array of data objects
    columns: [],           // Array of column definitions
    
    // Optional
    sortable: true,        // Enable column sorting (default: true)
    striped: true,         // Striped rows (default: true)
    hover: true,           // Hover effect (default: true)
    responsive: true       // Responsive design (default: true)
});
```

## Column Definitions

### Format 1: New Dynamic Format (Recommended)

Use `column_name`, `column_label`, and `column_type` for dynamic tables:

```javascript
{
    column_name: 'username',      // Field name in data object
    column_label: 'Username',      // Display label in header
    column_type: 'string'         // Data type for formatting/sorting
}
```

**Supported Column Types:**
- `string` - Plain text (default)
- `number` / `integer` / `int` - Numeric values with thousand separators
- `currency` / `money` - Currency formatting ($1,234.56)
- `date` - Date formatting (Jan 15, 2024)
- `datetime` / `timestamp` - Date and time formatting
- `boolean` / `bool` - Yes/No display
- `percentage` / `percent` - Percentage formatting (12.50%)

**Example with Dynamic Columns:**

```javascript
const columns = [
    { column_name: 'id', column_label: 'ID', column_type: 'number' },
    { column_name: 'username', column_label: 'Username', column_type: 'string' },
    { column_name: 'salary', column_label: 'Salary', column_type: 'currency' },
    { column_name: 'active', column_label: 'Active', column_type: 'boolean' },
    { column_name: 'created_at', column_label: 'Created Date', column_type: 'date' }
];

const table = new TableModule('my-table', {
    data: usersData,
    columns: columns
});
```

### Format 2: Legacy Format (Still Supported)

```javascript
{ key: 'name', header: 'Full Name' }
```

### Column with Custom Formatting

```javascript
{
    column_name: 'price',
    column_label: 'Price',
    column_type: 'currency',
    format: (value) => `$${value.toFixed(2)}`  // Override default formatter
}
```

### Column with Custom Key Function

```javascript
{
    key: (row) => `${row.firstName} ${row.lastName}`,
    header: 'Full Name'
}
```

### Non-sortable Column

```javascript
{
    column_name: 'actions',
    column_label: 'Actions',
    column_type: 'string',
    sortable: false
}
```

## PHP Integration

### Method 1: Embed Data in Page

```php
<?php
// Fetch data from database
$conn = new mysqli("localhost", "user", "pass", "db");
$result = $conn->query("SELECT * FROM users");
$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}
?>

<script>
const table = new TableModule('my-table', {
    data: <?php echo json_encode($users); ?>,
    columns: [
        { key: 'id', header: 'ID' },
        { key: 'username', header: 'Username' },
        { key: 'email', header: 'Email' }
    ]
});
</script>
```

### Method 2: Load via AJAX

```javascript
fetch('api.php?action=getUsers')
    .then(response => response.json())
    .then(data => {
        const table = new TableModule('my-table', {
            data: data,
            columns: [
                { key: 'id', header: 'ID' },
                { key: 'username', header: 'Username' }
            ]
        });
    });
```

## API Methods

### Update Data

```javascript
table.updateData(newDataArray);
```

### Update Columns

```javascript
table.updateColumns(newColumnsArray);
```

### Update Columns and Data

```javascript
table.updateColumnsAndData(newColumnsArray, newDataArray);
```

### Refresh Table

```javascript
table.refresh();
```

## Examples

See the included example files:

- `example.html` - Vanilla JavaScript examples (includes both old and new formats)
- `example-dynamic.html` - **NEW**: Dynamic columns example with type-based formatting
- `example.php` - PHP integration examples
- `api.php` - Example API endpoint

### Dynamic Columns Example

```javascript
// Define columns with column_name, column_label, column_type
const columns = [
    { column_name: 'id', column_label: 'ID', column_type: 'number' },
    { column_name: 'username', column_label: 'Username', column_type: 'string' },
    { column_name: 'email', column_label: 'Email', column_type: 'string' },
    { column_name: 'salary', column_label: 'Salary', column_type: 'currency' },
    { column_name: 'active', column_label: 'Active', column_type: 'boolean' },
    { column_name: 'created_at', column_label: 'Created', column_type: 'date' }
];

// Data structure matches column_name fields
const data = [
    { id: 1, username: 'admin', email: 'admin@example.com', salary: 95000, active: true, created_at: '2024-01-15' },
    { id: 2, username: 'john', email: 'john@example.com', salary: 75000, active: false, created_at: '2024-02-20' }
];

const table = new TableModule('my-table', {
    data: data,
    columns: columns
});

// Update columns and data dynamically
table.updateColumnsAndData(newColumns, newData);
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- IE11+ (with minor polyfills)

## Customization

### CSS Variables

You can customize colors by overriding CSS classes:

```css
.table-header {
    background-color: #your-color;
}

.table-module {
    border-radius: 12px; /* Custom border radius */
}
```

### Styling

All classes are prefixed with `table-` for easy customization:

- `.table-module` - Main table
- `.table-header` - Header cells
- `.table-cell` - Body cells
- `.table-container` - Table container wrapper
- `.table-row-striped` - Striped row styling
- `.table-row-hover` - Hover effect styling

## License

Free to use in any project, commercial or personal.

## Contributing

Feel free to modify and extend this module for your needs!

