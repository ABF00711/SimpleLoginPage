<?php
// Session is already started in register.php entry point
// Only check if user is already logged in (no redirect needed here as entry point handles it)
?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Register - Smart UI</title>

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="./frontend/assets/image/logo.png">
    <!-- Global styles -->
    <link rel="stylesheet" href="./frontend/assets/css/style.css">
    <link rel="stylesheet" href="./frontend/assets/css/register.css" />
    <link rel="stylesheet" href="./frontend/libs/smart-ui/source/styles/smart.default.css"/>

    <!-- Smart UI license config -->
    <script>
      window.Smart = window.Smart || {};
      window.Smart.License = "0A2C72B9-D78F-5E17-8D07-0CBC0E1EDC29";
    </script>

    <!-- Smart UI Components -->
    <script src="./frontend/libs/smart-ui/source/smart.elements.js"></script>
  </head>

  <body>
    <div class="login-card">
      <h2>Create account</h2>

      <!-- Registration form wrapper -->
      <form id="registerForm" novalidate>

      <div class="block">
        <!-- Email Input -->
        <div class="smart-form-row">
          <label>Email</label>
          <smart-input
            data-field="email"
            placeholder="Enter your email"
            class="underlined"
            form-control-name="email"
            required
            type="email"
          ></smart-input>
        </div>

        <!-- Username Input -->
        <div class="smart-form-row">
          <label>Username</label>
          <smart-input
            data-field="username"
            placeholder="Choose a username"
            class="underlined"
            form-control-name="userName"
            required
          ></smart-input>
        </div>

        <!-- Password Input with strength indicator -->
        <div class="smart-form-row">
          <label>Password</label>
          <smart-password-text-box
            show-password-icon
            show-password-strength
            type="password"
            data-field="password"
            placeholder="Enter password"
            class="underlined"
            form-control-name="password"
            required
          >
          </smart-password-text-box>
        </div>

        <div class="smart-form-row">
          <label>Confirm Password</label>
          <smart-password-text-box
            show-password-icon
            show-password-strength
            type="password"
            data-field="confirm_password"
            placeholder="Enter password again"
            class="underlined"
            form-control-name="confirm_password"
            required
          >
          </smart-password-text-box>
        </div>

        <!-- Error/message text -->
        <div class="smart-form-row">
          <p id="msg" class="msg"></p>
        </div>

        <!-- Submit Button + login redirect -->
        <div class="smart-form-row">
          <smart-button id="submitBtn" type="submit" class="primary">Register</smart-button>
          <p>Already have an account? <a href="./index.php">Login</a></p>
        </div>
      </form>
    </div>

    <!-- JS logic for registration -->
    <script src="./frontend/assets/js/register.js"></script>
  </body>
</html>

