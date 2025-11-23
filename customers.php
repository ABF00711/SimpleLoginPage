<?php
// Page configuration
$pageTitle = 'Customers';
$pageStyles = ['customers.css'];
$pageScripts = ['dashboard.js'];

// Start output buffering to capture page content
ob_start();
?>

<div class="card">
  <h2>User Customers</h2>
  <p class="subtitle">Here&apos;s a quick overview of registered users:</p>

  <!-- SmartGrid for displaying users -->
  <smart-grid id="grid"></smart-grid>

  <!-- Button to open the Add User modal -->
  <div class="add-user-button" style="display:flex; gap:10px;">
    <smart-button id="bulkDeleteBtn" type="button" class="error">Delete Selected</smart-button>
    <smart-button id="addNewUserBtn" type="button" class="primary">Add user</smart-button>
  </div>

</div>

<?php
// Capture main content
$content = ob_get_clean();

// Capture modals and additional HTML
ob_start();
?>

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

<?php
$additionalHTML = ob_get_clean();

// Include the layout
require __DIR__ . '/includes/layout.php';
?>
