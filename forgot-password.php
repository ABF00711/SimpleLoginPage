<?php
// Check for remember me cookie and auto-login
require_once __DIR__ . '/backend/check-remember-me.php';

// If user is already logged in, redirect to dashboard
if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
    header("Location: dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Forgot Password - BeornNotes</title>

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
    <h2>Forgot Password</h2>

    <!-- Forgot Password Form -->
    <form id="forgot-password-form">
      <div class="smart-form-row">
        <label>Email or Username:</label>
        <smart-input
          data-field="identifier"
          placeholder="Enter your email or username"
          class="underlined"
          form-control-name="identifier"
          required
        ></smart-input>
      </div>

      <!-- Error / Status message container -->
      <div class="smart-form-row">
        <p id="message"></p>
      </div>

      <!-- Submit Button + Back to Login -->
      <div class="smart-form-row submit">
        <smart-button class="success" type="submit">Send Reset Link</smart-button>
        <p>
          <a href="./index.php">Back to login</a>
        </p>
      </div>
    </form>
  </div>

  <!-- Forgot Password page logic -->
  <script src="./frontend/assets/js/forgot-password.js"></script>
</body>
</html>

