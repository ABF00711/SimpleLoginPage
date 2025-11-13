<?php
session_start(); // Start session to access session variables

// Clear all session data
session_unset();

// Destroy the current session
session_destroy();

// Redirect user back to login page
header("Location: index.php");
exit; // Stop further script execution
?>
