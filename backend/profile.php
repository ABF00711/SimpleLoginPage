<?php
/**
 * Profile API
 * Handles profile-related requests
 */

header('Content-Type: application/json');

// Start output buffering
ob_start();

try {
    require_once __DIR__ . '/db.php';
    
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Check if user is logged in
    if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
        ob_end_clean();
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Unauthorized'
        ]);
        exit;
    }
    
    $action = $_GET['action'] ?? $_POST['action'] ?? null;
    
    switch ($action) {
        case 'getMFA':
            handleGetMFA();
            break;
        default:
            ob_end_clean();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Invalid action'
            ]);
            exit;
    }
    
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

/**
 * Get current MFA status for logged-in user
 */
function handleGetMFA() {
    global $conn;
    
    $userId = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("SELECT mfa FROM users WHERE id = ? LIMIT 1");
    if (!$stmt) {
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        throw new Exception('User not found');
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'mfa' => $user['mfa'] ?? 0
    ]);
}
?>

