<?php
/**
 * Session Timeout API
 * Handles session destruction for timeout logout
 */

header('Content-Type: application/json');

// Start output buffering
ob_start();

try {
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    // Destroy session
    session_unset();
    session_destroy();

    // Also clear remember me cookie if exists
    if (isset($_COOKIE['remember_me_token'])) {
        require_once __DIR__ . '/remember-me.php';
        $token = $_COOKIE['remember_me_token'];
        deleteRememberToken($token);
        setcookie('remember_me_token', '', time() - 3600, '/');
    }

    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Session destroyed'
    ]);

} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>

