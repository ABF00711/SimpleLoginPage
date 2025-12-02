<?php
// Page configuration
$pageTitle = 'Profile';
$pageStyles = ['profile.css'];
$pageScripts = ['profile.js'];

// Start output buffering to capture page content
ob_start();
?>

<div class="card">
  <h2>User Profile</h2>
  
  <div class="profile-content">
    <!-- User Information Section -->
    <div class="profile-section">
      <h3>User Information</h3>
      
      <form id="user-info-form" class="profile-form">
        <div class="form-group">
          <label for="username-input">Username</label>
          <smart-input 
            type="text" 
            id="username-input" 
            placeholder="Enter username"
            required>
          </smart-input>
        </div>
        
        <div class="form-group">
          <label for="email-input">Email</label>
          <smart-input 
            type="email" 
            id="email-input" 
            placeholder="Enter email address"
            required>
          </smart-input>
        </div>
        
        <div class="form-actions">
          <smart-button type="submit" class="primary">Update Information</smart-button>
        </div>
        
        <div id="user-info-message" class="profile-message"></div>
      </form>
    </div>
    
    <!-- Password Change Section -->
    <div class="profile-section">
      <h3>Change Password</h3>
      
      <form id="password-change-form" class="profile-form">
        <div class="form-group">
          <label for="current-password-input">Current Password</label>
          <smart-input 
            type="password" 
            id="current-password-input" 
            placeholder="Enter current password"
            required>
          </smart-input>
        </div>
        
        <div class="form-group">
          <label for="new-password-input">New Password</label>
          <smart-input 
            type="password" 
            id="new-password-input" 
            placeholder="Enter new password"
            required>
          </smart-input>
        </div>
        
        <div class="form-group">
          <label for="confirm-password-input">Confirm New Password</label>
          <smart-input 
            type="password" 
            id="confirm-password-input" 
            placeholder="Confirm new password"
            required>
          </smart-input>
        </div>
        
        <div class="form-actions">
          <smart-button type="submit" class="primary">Change Password</smart-button>
        </div>
        
        <div id="password-change-message" class="profile-message"></div>
      </form>
    </div>
    
    <!-- 2FA Section -->
    <div class="profile-section">
      <h3>Account Settings</h3>
      
      <div class="profile-setting">
        <div class="setting-label">
          <label>Two-Factor Authentication (2FA)</label>
          <p class="setting-description">Add an extra layer of security to your account</p>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input type="checkbox" id="mfa-toggle">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- 2FA Setup Modal -->
      <div id="mfa-setup-modal" class="mfa-setup-modal" style="display: none;">
        <div class="mfa-setup-content">
          <div class="mfa-setup-header">
            <h3>Set Up Two-Factor Authentication</h3>
            <button type="button" class="mfa-close-btn" id="mfa-close-btn">&times;</button>
          </div>
          <div class="mfa-setup-body">
            <p class="mfa-instructions">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
            </p>
            <div class="qr-code-container">
              <smart-qrcode id="qr-code-image" value="" style="display: none;"></smart-qrcode>
            </div>
            <div class="secret-container" style="display: none;">
              <p class="secret-label">Or enter this secret key manually:</p>
              <div class="secret-display">
                <code id="secret-text"></code>
                <button type="button" class="copy-secret-btn" id="copy-secret-btn">Copy</button>
              </div>
            </div>
            <p class="mfa-warning">
              <strong>Important:</strong> Save this secret key in a secure place. You'll need it to set up 2FA on a new device.
            </p>
            <div class="mfa-setup-actions">
              <smart-button class="primary" id="mfa-setup-done-btn">I've Set Up My Authenticator</smart-button>
            </div>
          </div>
        </div>
      </div>
      
      <div id="profile-message" class="profile-message"></div>
    </div>
  </div>
</div>

<?php
// Capture main content
$content = ob_get_clean();

// Include the layout
require __DIR__ . '/../includes/layout.php';
?>
