<?php
/**
 * Check Remember Me Cookie and Auto-Login
 * This should be included at the top of pages that require authentication
 */

// Start session only if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/remember-me.php';

// Only check if user is not already logged in
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    // Check for remember me cookie
    if (isset($_COOKIE['remember_me_token'])) {
        $token = $_COOKIE['remember_me_token'];
        $user = validateRememberToken($token);
        
        if ($user) {
            // Auto-login the user
            $_SESSION['loggedin'] = true;
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['name'];
            $_SESSION['email'] = $user['email'];
        } else {
            // Invalid or expired token, delete the cookie
            setcookie('remember_me_token', '', time() - 3600, '/');
        }
    }
}
?>

