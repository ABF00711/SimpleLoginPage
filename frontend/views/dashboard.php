<?php
// Page configuration
$pageTitle = 'Dashboard';
$pageScripts = ['dashboard.js'];

// Start output buffering to capture page content
ob_start();
?>

<div class="card">
  <h2>Dashboard</h2>
</div>

<?php
// Capture main content
$content = ob_get_clean();


// Include the layout
require __DIR__ . '/../includes/layout.php';
?>
