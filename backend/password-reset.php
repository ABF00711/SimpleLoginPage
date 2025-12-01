<?php
/**
 * Password Reset Token Management
 * Handles creating, validating, and deleting password reset tokens
 * Uses existing PasswordResetToken and PasswordResetTime columns in users table
 */

require_once __DIR__ . '/db.php';

/**
 * Create a password reset token for a user
 * @param int $userId User ID
 * @return string|false Token string on success, false on failure
 */
function createPasswordResetToken($userId) {
    global $conn;
    
    // Generate a secure random token
    $token = bin2hex(random_bytes(32)); // 64 character hex string
    
    // Set expiration to 1 hour from now (stored in PasswordResetTime)
    $resetTime = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    // Update user record with token and expiration time
    $stmt = $conn->prepare("UPDATE users SET PasswordResetToken = ?, PasswordResetTime = ? WHERE id = ?");
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("ssi", $token, $resetTime, $userId);
    
    if ($stmt->execute()) {
        $stmt->close();
        return $token;
    }
    
    $stmt->close();
    return false;
}

/**
 * Validate a password reset token
 * @param string $token Token to validate
 * @return array|false User data on success, false on failure
 */
function validatePasswordResetToken($token) {
    global $conn;
    
    // Find user with matching token and check if it's not expired
    // PasswordResetTime should be in the future (token is still valid)
    $stmt = $conn->prepare("SELECT id, name, email, PasswordResetToken, PasswordResetTime 
                            FROM users 
                            WHERE PasswordResetToken = ? 
                            AND PasswordResetTime > NOW() 
                            LIMIT 1");
    
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result && $result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $stmt->close();
        // Return only user data (exclude token fields)
        return [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email']
        ];
    }
    
    $stmt->close();
    return false;
}

/**
 * Delete a password reset token
 * @param string $token Token to delete
 * @return bool Success status
 */
function deletePasswordResetToken($token) {
    global $conn;
    
    // Clear the token and reset time for the user
    $stmt = $conn->prepare("UPDATE users SET PasswordResetToken = NULL, PasswordResetTime = NULL WHERE PasswordResetToken = ?");
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("s", $token);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}

/**
 * Delete all password reset tokens for a user
 * @param int $userId User ID
 * @return bool Success status
 */
function deleteUserPasswordResetTokens($userId) {
    global $conn;
    
    // Clear the token and reset time for the user
    $stmt = $conn->prepare("UPDATE users SET PasswordResetToken = NULL, PasswordResetTime = NULL WHERE id = ?");
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("i", $userId);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}
?>

