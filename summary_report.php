<?php
// Page configuration
$pageTitle = 'Summary Report';
$pageStyles = ['summary_report.css'];
$pageScripts = [];

// Start output buffering to capture page content
ob_start();
?>

<div class="card">
  <h2>Summary Report</h2>
</div>

<?php
// Capture main content
$content = ob_get_clean();

// Include the layout
require __DIR__ . '/includes/layout.php';
?>
