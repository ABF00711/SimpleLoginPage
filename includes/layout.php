<?php
/**
 * Main Layout Template
 * 
 * This layout provides a common structure for all authenticated pages.
 * 
 * @param string $pageTitle - The title of the page
 * @param array $pageStyles - Array of additional CSS files to include (relative to assets/css/)
 * @param array $pageScripts - Array of additional JS files to include (relative to assets/js/)
 * @param bool $requireAuth - Whether to require authentication (default: true)
 */

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Require authentication by default
if (!isset($requireAuth) || $requireAuth === true) {
    if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
        header("Location: index.php");
        exit;
    }
}

// Check if we're in API mode (don't render HTML, just set variables)
if (defined('API_MODE') && API_MODE === true) {
    // In API mode, we just need the variables set, don't render HTML
    return;
}

// Set default values
$pageTitle = $pageTitle ?? 'BeornNotes';
$pageStyles = $pageStyles ?? [];
$pageScripts = $pageScripts ?? [];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?php echo htmlspecialchars($pageTitle); ?></title>

<!-- Favicon -->
<link rel="icon" type="image/png" href="./assets/image/logo.png">

<!-- Global styles -->
<link rel="stylesheet" href="./assets/css/style.css">
<link rel="stylesheet" href="./assets/css/dashboard.css">

<!-- Page-specific styles -->
<?php foreach ($pageStyles as $style): ?>
<link rel="stylesheet" href="./assets/css/<?php echo htmlspecialchars($style); ?>">
<?php endforeach; ?>

<!-- Smart UI default theme -->
<link rel="stylesheet" href="./libs/smart-ui/source/styles/smart.default.css">

<!-- Smart UI license setup -->
<script>
  window.Smart = window.Smart || {};
  window.Smart.License = "0A2C72B9-D78F-5E17-8D07-0CBC0E1EDC29";
</script>

<!-- Smart UI framework -->
<script src="./libs/smart-ui/source/smart.elements.js"></script>

</head>

<body>

  <?php include __DIR__ . '/header.php'; ?>

  <!-- Page content area -->
  <main class="content">
    <?php
    // Page content will be inserted here via output buffering
    if (isset($content)) {
        echo $content;
    }
    ?>
  </main>

  <?php
  // Additional HTML (modals, etc.) can be added here
  if (isset($additionalHTML)) {
      echo $additionalHTML;
  }
  ?>

  <!-- Common scripts -->
  <script src="./assets/js/router.js"></script>
  <script src="./assets/js/menu.js"></script>
  
  <!-- Page-specific scripts -->
  <?php foreach ($pageScripts as $script): ?>
  <script src="./assets/js/<?php echo htmlspecialchars($script); ?>"></script>
  <?php endforeach; ?>

</body>
</html>

