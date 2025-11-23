<?php
// Page configuration
$pageTitle = 'Customers';
$pageStyles = ['customers.css'];
$pageScripts = ['dashboard.js'];

// Start output buffering to capture page content
ob_start();
?>

<div class="card">

  <!-- SmartGrid for displaying users -->
  <smart-grid id="grid"></smart-grid>

  <!-- Button to open the Add User modal -->
  <div class="add-user-button" style="display:flex; gap:10px;">
    <smart-button id="bulkDeleteBtn" type="button" class="error">Delete Selected</smart-button>
    <smart-button id="addNewUserBtn" type="button" class="primary">Add user</smart-button>
  </div>

</div>

<?php
// Capture main content
$content = ob_get_clean();

// Include the layout
require __DIR__ . '/includes/layout.php';
?>
