<?php
// Header Component
// This file contains the common header used across all authenticated pages
?>
<!-- Top header section -->
<header>
  <div class="header-left">
    <div class="appIcon">
      <img src="./frontend/assets/image/logo.png" alt="BeornNotes Logo">
    </div>
    <h1 class="app-title">BeornNotes</h1>
  </div>
  <div class="header-middle">
    <smart-menu id="menu" drop-down-append="body">
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
          <a href="./frontend/views/profile.php">Profile</a>
        </smart-list-item>
        <smart-list-item value="logout" class="dropdown-item logout-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <a href="../views/logout.php">Logout</a>
        </smart-list-item>
      </smart-drop-down-list>
    </div>
  </div>
</header>

