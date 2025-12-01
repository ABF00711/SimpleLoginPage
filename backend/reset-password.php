<?php
/**
 * Reset Password API
 * Handles password reset with token validation
 */

header('Content-Type: application/json');

// Start output buffering
ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/password-reset.php';
    
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    
    $token = $json['token'] ?? $_POST['token'] ?? null;
    $password = $json['password'] ?? $_POST['password'] ?? null;
    $confirmPassword = $json['confirm_password'] ?? $_POST['confirm_password'] ?? null;
    
    if (!$token || !$password || !$confirmPassword) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Please provide token, password, and confirmation'
        ]);
        ob_end_flush();
        exit;
    }
    
    // Validate passwords match
    if ($password !== $confirmPassword) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Passwords do not match'
        ]);
        exit;
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 6 characters long'
        ]);
        exit;
    }
    
    // Validate token
    $tokenData = validatePasswordResetToken($token);
    
    if (!$tokenData) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired reset token. Please request a new one.'
        ]);
        exit;
    }
    
    // Hash new password (using MD5 to match existing system)
    $hashedPassword = md5($password);
    
    // Update user password
    $sql = "UPDATE users SET hashedpassword = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param("si", $hashedPassword, $tokenData['id']);
    
    if (!$stmt->execute()) {
        throw new Exception('Database error: ' . $stmt->error);
    }
    
    $stmt->close();
    
    // Delete the used token
    deletePasswordResetToken($token);
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Password has been reset successfully. You can now login with your new password.'
    ]);
    
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

if (isset($conn)) {
    $conn->close();
}
?>

