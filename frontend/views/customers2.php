<?php
// Page configuration
$pageTitle = 'Customers2';
$pageStyles = ['customers2.css'];
$pageScripts = [];

// Start output buffering to capture page content
ob_start();
?>

<div class="card">
  <h2>User Customers2</h2>
</div>

<?php
// Capture main content
$content = ob_get_clean();

// Include the layout
require __DIR__ . '/../includes/layout.php';
?>
