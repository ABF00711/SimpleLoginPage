<?php
session_start(); // Start session to check user login state

// If user is already logged in, redirect to dashboard
if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
    header("Location: dashboard.php");
    exit; // Stop script execution after redirect
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Smart UI Hybrid Login</title>

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
    window.Smart.License = "0A2C72B9-D78F-5E17-8D07-0CBC0E1EDC29"; // Smart UI license key
  </script>

  <!-- Smart UI library -->
  <script src="./frontend/libs/smart-ui/source/smart.elements.js"></script>
</head>

<body>
  <div class="login-card">
    <h2>Login</h2>

    <!-- Login Form -->
    <form id="login">

      <!-- Username Field -->
      <div class="smart-form-row">
        <label>Username:</label>
        <smart-input
          data-field="username"
          placeholder="Enter username"
          class="underlined"
          form-control-name="userName"
          required
        ></smart-input>
      </div>

      <!-- Password Field -->
      <div class="smart-form-row">
        <label>Password:</label>
        <smart-password-text-box
          show-password-icon
          type="password"
          data-field="password"
          placeholder="Enter password"
          class="underlined"
          form-control-name="password"
          required
        ></smart-password-text-box>
      </div>

      <!-- Error / Status message container -->
      <div class="smart-form-row">
        <p id="message"></p>
      </div>

      <!-- Submit Button + Link to Register -->
      <div class="smart-form-row submit">
        <smart-button class="success" type="submit">Login</smart-button>
        <p>don't have an account?
          <a href="./register.php">register</a>
        </p>
      </div>

    </form>
  </div>

  <!-- Login page logic -->
  <script src="./frontend/assets/js/login.js"></script>
</body>
</html>

