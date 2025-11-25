<?php
// Page configuration
$pageTitle = 'Customers';
$pageStyles = [
    'customers.css',
    'libs/CustomTable/table-module.css'
];
// CustomTable scripts must be loaded before customers.js
// Using absolute paths from root
$pageScripts = [
    'libs/CustomTable/modules/formatter.js',
    'libs/CustomTable/modules/column-manager.js',
    'libs/CustomTable/modules/state-manager.js',
    'libs/CustomTable/modules/filter.js',
    'libs/CustomTable/modules/sorter.js',
    'libs/CustomTable/modules/resizer.js',
    'libs/CustomTable/modules/reorderer.js',
    'libs/CustomTable/modules/visibility-manager.js',
    'libs/CustomTable/modules/renderer.js',
    'libs/CustomTable/table-module.js',
    'customers.js'
];

// Start output buffering to capture page content
ob_start();
?>

<div class="card">
  <!-- Button to open the Add User modal -->
  <div class="add-user-button" style="display:flex; gap:10px;">
    <smart-button id="bulkDeleteBtn" type="button" class="error">Delete Selected</smart-button>
    <smart-button id="addNewUserBtn" type="button" class="primary">Add user</smart-button>
  </div>
  <!-- CustomTable container -->
  <div id="customers-table"></div>

</div>

<?php
// Capture main content
$content = ob_get_clean();

// Include the layout
require __DIR__ . '/includes/layout.php';
?>