<?php
// Page configuration
$pageTitle = 'Customers2';
$pageStyles = [
    'customers2.css',
    'libs/CustomTable/table-module.css'
];
// CustomTable scripts must be loaded before customers2.js
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
    'libs/CustomTable/modules/add-modal.js',
    'libs/CustomTable/modules/pattern-manager.js',
    'libs/CustomTable/modules/column-menu.js',
    'libs/CustomTable/table-module.js',
    'customers2.js'
];

// Start output buffering to capture page content
ob_start();
?>

<!-- Search Form Card -->
<form id="customers2-search-form" class="customers2-search-form">
    <div class="search-fields">
        <div class="search-field">
            <label for="age-search">Age</label>
            <smart-input 
                type="number" 
                id="age-search" 
                min="0">
            </smart-input>
        </div>
        <div class="search-field">
            <label for="job-search">Job</label>
            <smart-drop-down-list 
                id="job-search" 
            >
            </smart-drop-down-list>
        </div>  
    </div>
    <div class="search-actions">
        <smart-button type="submit" class="primary">Search</smart-button>
    </div>
</form>

<!-- Table Container -->
<div class="card">
    <div id="customers2-table"></div>
</div>

<?php
// Capture main content
$content = ob_get_clean();

// Include the layout
require __DIR__ . '/../includes/layout.php';
?>
