<?php
// Check for remember me cookie and auto-login
require_once __DIR__ . '/backend/check-remember-me.php';

// If user is already logged in, redirect to dashboard
if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
    header("Location: dashboard.php");
    exit;
}

// Get token from URL
$token = $_GET['token'] ?? '';

if (empty($token)) {
    header("Location: forgot-password.php?error=invalid_token");
    exit;
}

// Validate token (check if it exists and is not expired)
require_once __DIR__ . '/backend/password-reset.php';
$tokenData = validatePasswordResetToken($token);

if (!$tokenData) {
    header("Location: forgot-password.php?error=expired_token");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password - BeornNotes</title>

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="./frontend/assets/image/logo.png">
  <!-- Main global styles -->
  <link rel="stylesheet" href="./frontend/assets/css/style.css">
  <!-- Page-specific styles -->
  <link rel="stylesheet" href="./frontend/assets/css/login.css" />
  <!-- Smart UI Components style -->
  <link rel="stylesheet" href="./frontend/libs/smart-ui/source/styles/smart.default.css"/>

  <!-- Smart UI License and script initialization -->
  <script>
    window.Smart = window.Smart || {};
    window.Smart.License = "0A2C72B9-D78F-5E17-8D07-0CBC0E1EDC29";
  </script>

  <!-- Smart UI library -->
  <script src="./frontend/libs/smart-ui/source/smart.elements.js"></script>
</head>

<body>
  <div class="login-card">
    <h2>Reset Password</h2>

    <!-- Reset Password Form -->
    <form id="reset-password-form">
      <input type="hidden" id="token" value="<?php echo htmlspecialchars($token); ?>">

      <div class="smart-form-row">
        <label>New Password:</label>
        <smart-password-text-box
          show-password-icon
          type="password"
          data-field="password"
          placeholder="Enter new password"
          class="underlined"
          form-control-name="password"
          required
        ></smart-password-text-box>
      </div>

      <div class="smart-form-row">
        <label>Confirm Password:</label>
        <smart-password-text-box
          show-password-icon
          type="password"
          data-field="confirm_password"
          placeholder="Confirm new password"
          class="underlined"
          form-control-name="confirmPassword"
          required
        ></smart-password-text-box>
      </div>

      <!-- Error / Status message container -->
      <div class="smart-form-row">
        <p id="message"></p>
      </div>

      <!-- Submit Button + Back to Login -->
      <div class="smart-form-row submit">
        <smart-button class="success" type="submit">Reset Password</smart-button>
        <p>
          <a href="./index.php">Back to login</a>
        </p>
      </div>
    </form>
  </div>

  <!-- Reset Password page logic -->
  <script src="./frontend/assets/js/reset-password.js"></script>
</body>
</html>

