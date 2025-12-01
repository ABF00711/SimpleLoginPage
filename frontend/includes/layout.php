<?php
// Check for remember me cookie and auto-login
require_once __DIR__ . '/../../backend/check-remember-me.php';

if (!isset($requireAuth) || $requireAuth === true) {
    if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
        header("Location: index.php");
        exit;
    }
}

if (defined('API_MODE') && API_MODE === true) {
    return;
}

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
<link rel="icon" type="image/png" href="./frontend/assets/image/logo.png">

<!-- Global styles -->
<link rel="stylesheet" href="./frontend/assets/css/style.css">
<link rel="stylesheet" href="./frontend/assets/css/dashboard.css">

<?php foreach ($pageStyles as $style): ?>
<?php if (strpos($style, 'libs/') === 0 || strpos($style, '/') === 0): ?>
<link rel="stylesheet" href="./frontend/<?php echo htmlspecialchars($style); ?>">
<?php else: ?>
<link rel="stylesheet" href="./frontend/assets/css/<?php echo htmlspecialchars($style); ?>">
<?php endif; ?>
<?php endforeach; ?>

<link rel="stylesheet" href="./frontend/libs/smart-ui/source/styles/smart.default.css">
<link rel="stylesheet" href="./frontend/assets/css/layout.css">

<script>
  window.Smart = window.Smart || {};
  window.Smart.License = "0A2C72B9-D78F-5E17-8D07-0CBC0E1EDC29";
</script>

<script src="./frontend/libs/smart-ui/source/smart.elements.js"></script>

</head>

<body>

  <?php include __DIR__ . '/header.php'; ?>

  <!-- Message banner (fetched from message table) -->
  <div id="message-banner" class="message-banner" style="display: none;">
    <div class="message-banner-content">
      <span class="message-text"></span>
      <button type="button" class="message-close" aria-label="Close message">&times;</button>
    </div>
  </div>

  <main class="content">
    <smart-tabs id="tabs" class="demoTabs" reorder close-buttons></smart-tabs>
  </main>

  <?php include __DIR__ . '/footer.php'; ?>

  <?php
  if (isset($additionalHTML)) {
      echo $additionalHTML;
  }
  ?>

  <script src="./frontend/assets/js/router.js"></script>
  <script src="./frontend/assets/js/tabManager.js"></script>
  <script src="./frontend/assets/js/menu.js"></script>
  <script src="./frontend/assets/js/message.js"></script>
  
  <?php foreach ($pageScripts as $script): ?>
  <?php if (strpos($script, 'libs/') === 0 || strpos($script, '/') === 0): ?>
  <script src="./frontend/<?php echo htmlspecialchars($script); ?>"></script>
  <?php else: ?>
  <script src="./frontend/assets/js/<?php echo htmlspecialchars($script); ?>"></script>
  <?php endif; ?>
  <?php endforeach; ?>

</body>
</html>

