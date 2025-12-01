<?php
/**
 * Forgot Password API
 * Handles password reset requests
 */

header('Content-Type: application/json');

// Start output buffering
ob_start();

try {
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/password-reset.php';
    
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    
    $identifier = $json['identifier'] ?? $_POST['identifier'] ?? null;
    
    if (!$identifier) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Please provide your email or username'
        ]);
        ob_end_flush();
        exit;
    }
    
    // Find user by email or username
    $sql = "SELECT id, name, email FROM users WHERE name = ? OR email = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param("ss", $identifier, $identifier);
    
    if (!$stmt->execute()) {
        throw new Exception('Database error: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Don't reveal if user exists or not (security best practice)
        // But for development, we can be more helpful
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'If an account with that email/username exists, a password reset link has been sent.'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Create password reset token
    $token = createPasswordResetToken($user['id']);
    
    if (!$token) {
        throw new Exception('Failed to create reset token');
    }
    
    // Build reset link (pointing to frontend reset-password.php at root, not backend)
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    // Always point to root reset-password.php (not backend/reset-password.php)
    $resetLink = $protocol . '://' . $host . '/reset-password.php?token=' . $token;
    
    // TODO: Send email with reset link
    // For now, return the link in development mode
    // In production, you would send an email here using mail() or a library like PHPMailer
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Password reset link has been sent to your email.',
        'resetLink' => $resetLink // Remove this in production
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

