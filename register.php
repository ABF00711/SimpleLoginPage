<?php
/**
 * Register Entry Point
 * Loads the registration page
 */

session_start();

// If user already logged in redirect to dashboard
if (isset($_SESSION['loggedin']) && $_SESSION['loggedin'] === true) {
    header("Location: dashboard.php");
    exit;
}

// Load the register view
require __DIR__ . '/frontend/views/register.php';

