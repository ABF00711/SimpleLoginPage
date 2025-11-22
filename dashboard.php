<?php
session_start(); // Start session to check login status

// Redirect to login page if user is not authenticated
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    header("Location: index.php");
    exit;
}
?>


<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>

<!-- Favicon -->
<link rel="icon" type="image/png" href="./assets/image/logo.png">
<!-- Global styles -->
<link rel="stylesheet" href="./assets/css/style.css">
<!-- Dashboard specific styles -->
<link rel="stylesheet" href="./assets/css/dashboard.css">
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

  <!-- Top header section -->
  <header>
    <div class="header-left">
      <div class="appIcon">
        <img src="./assets/image/logo.png" alt="">
      </div>
      <h1 class="app-title">BeornNotes</h1>
    </div>
    <div class="header-middle">
      <smart-menu id = "menu" drop-down-append = "body">
      </smart-menu>
    </div>
    <div class="header-right">
      <div class="user-menu">
        <smart-drop-down-list selected-indexes="[0]" class="user-dropdown">
          <smart-list-item value="username">
            <span class="dropdown-username"><?php echo htmlspecialchars($_SESSION['username']); ?></span>
          </smart-list-item>
          <smart-list-item value="profile" class="dropdown-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <a href="./profile.php">Profile</a>
          </smart-list-item>
          <smart-list-item value="logout" class="dropdown-item logout-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <a href="./logout.php">Logout</a>
          </smart-list-item>
        </smart-drop-down-list>
      </div>
    </div>
  </header>

  <!-- Page content area -->
  <main class="content">
    <div class="card">
      <h2>User Dashboard</h2>
      <p class="subtitle">Here&apos;s a quick overview of registered users:</p>

      <!-- SmartGrid for displaying users -->
      <smart-grid id="grid"></smart-grid>

      <!-- Button to open the Add User modal -->
      <div class="add-user-button" style="display:flex; gap:10px;">
        <smart-button id="bulkDeleteBtn" type="button" class="error">Delete Selected</smart-button>
        <smart-button id="addNewUserBtn" type="button" class="primary">Add user</smart-button>
      </div>

    </div>
  </main>

  <!-- Add/Edit user modal -->
  <smart-window id="addUserWindow" label="Create User" modal header-buttons="close">
    <form id="addUserForm">

      <input type="hidden" data-field="id"> <!-- Holds user ID during edit -->

      <div class="flex">
        <!-- First name input -->
        <div class="smart-form-row">
          <label>First name</label>
          <smart-input data-field="firstName" placeholder="First name" class="underlined" required></smart-input>
        </div>

        <!-- Last name input -->
        <div class="smart-form-row">
          <label>Last name</label>
          <smart-input data-field="lastName" placeholder="Last name" class="underlined" required></smart-input>
        </div>
      </div>

      <!-- Email field -->
      <div class="smart-form-row">
        <label>Email</label>
        <smart-input data-field="email" type="email" placeholder="Email" class="underlined" required></smart-input>
      </div>

      <!-- Username field -->
      <div class="smart-form-row">
        <label>Username</label>
        <smart-input data-field="username" placeholder="Username" class="underlined" required></smart-input>
      </div>

      <!-- Password field (only used when creating or changing password) -->
      <div class="smart-form-row">
        <label>Password</label>
        <smart-password-text-box data-field="password" placeholder="Password" class="underlined"></smart-password-text-box>
      </div>

      <!-- Address input -->
      <div class="smart-form-row">
        <label>Address</label>
        <smart-input data-field="address" placeholder="Address" class="underlined"></smart-input>
      </div>

      <div class="msg"></div>

      <!-- Submit button -->
      <div class="smart-form-row submit">
        <smart-button id="formSubmitBtn" type="submit" class="primary">Create</smart-button>
      </div>

    </form>
  </smart-window>

  <!-- Delete confirmation modal -->
  <smart-window id="confirmDeleteWin" label="Confirm" modal header-buttons="close">
    <div style="padding: 15px;">
      Are you sure you want to delete this user?
    </div>
    <div style="display:flex; gap:10px; justify-content:flex-end; padding: 10px;">
      <smart-button id="cancelDeleteBtn" class="primary">Cancel</smart-button>
      <smart-button id="confirmDeleteBtn" class="error">Delete</smart-button>
    </div>
  </smart-window>

  <!-- Message popup modal -->
  <smart-window id="msgWin" label="Message" modal header-buttons="close">
      <div id="msgText" style="padding: 15px;"></div>
  </smart-window>

  <!-- Dashboard logic file -->
  <!-- Menu renderer (inserts menu into #header-menu) -->
  <script src="./assets/js/menu.js"></script>
  <!-- Dashboard logic file -->
  <script type="module" src="./assets/js/dashboard.js"></script>

</body>
</html>

