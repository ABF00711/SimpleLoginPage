<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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
<link rel="icon" type="image/png" href="./assets/image/logo.png">

<!-- Global styles -->
<link rel="stylesheet" href="./assets/css/style.css">
<link rel="stylesheet" href="./assets/css/dashboard.css">

<?php foreach ($pageStyles as $style): ?>
<?php if (strpos($style, 'libs/') === 0 || strpos($style, '/') === 0): ?>
<link rel="stylesheet" href="./<?php echo htmlspecialchars($style); ?>">
<?php else: ?>
<link rel="stylesheet" href="./assets/css/<?php echo htmlspecialchars($style); ?>">
<?php endif; ?>
<?php endforeach; ?>

<link rel="stylesheet" href="./libs/smart-ui/source/styles/smart.default.css">
<link rel="stylesheet" href="./assets/css/layout.css">

<script>
  window.Smart = window.Smart || {};
  window.Smart.License = "0A2C72B9-D78F-5E17-8D07-0CBC0E1EDC29";
</script>

<script src="./libs/smart-ui/source/smart.elements.js"></script>

</head>

<body>

  <?php include __DIR__ . '/header.php'; ?>

  <main class="content">
    <smart-tabs id="tabs" class="demoTabs" reorder close-buttons></smart-tabs>
  </main>

  <?php
  if (isset($additionalHTML)) {
      echo $additionalHTML;
  }
  ?>

  <script src="./assets/js/router.js"></script>
  <script src="./assets/js/tabManager.js"></script>
  <script src="./assets/js/menu.js"></script>
  
  <?php foreach ($pageScripts as $script): ?>
  <?php if (strpos($script, 'libs/') === 0 || strpos($script, '/') === 0): ?>
  <script src="./<?php echo htmlspecialchars($script); ?>"></script>
  <?php else: ?>
  <script src="./assets/js/<?php echo htmlspecialchars($script); ?>"></script>
  <?php endif; ?>
  <?php endforeach; ?>

</body>
</html>

