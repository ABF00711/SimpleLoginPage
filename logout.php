<?php
/**
 * Logout Entry Point
 * Handles user logout and redirects to login page
 */

session_start(); // Start session to access session variables
require_once __DIR__ . '/backend/remember-me.php';

// Delete remember me token if it exists
if (isset($_COOKIE['remember_me_token'])) {
    $token = $_COOKIE['remember_me_token'];
    deleteRememberToken($token);
    // Delete the cookie
    setcookie('remember_me_token', '', time() - 3600, '/');
}

// Also delete all tokens for this user if user_id is available
if (isset($_SESSION['user_id'])) {
    deleteAllUserTokens($_SESSION['user_id']);
}

// Clear all session data
session_unset();

// Destroy the current session
session_destroy();

// Redirect user back to login page
header("Location: index.php");
exit; // Stop further script execution

