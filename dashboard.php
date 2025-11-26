<?php
/**
 * Dashboard Entry Point
 * Redirects to the main application entry point
 */

session_start();

// Check if user is logged in
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    header("Location: index.php");
    exit;
}

// Load the dashboard view
require __DIR__ . '/frontend/views/dashboard.php';

