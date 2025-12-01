<?php
/**
 * Remember Me Token Management
 * Handles creating, validating, and deleting remember me tokens
 */

require_once 'db.php';

/**
 * Create a remember me token for a user
 * @param int $userId User ID
 * @return string|false Token string on success, false on failure
 */
function createRememberToken($userId) {
    global $conn;
    
    // Generate a secure random token
    $token = bin2hex(random_bytes(32)); // 64 character hex string
    
    // Set expiration to 30 days from now
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    
    // Insert token into database
    $stmt = $conn->prepare("INSERT INTO remember_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("iss", $userId, $token, $expiresAt);
    
    if ($stmt->execute()) {
        $stmt->close();
        return $token;
    }
    
    $stmt->close();
    return false;
}

/**
 * Validate a remember me token
 * @param string $token Token to validate
 * @return array|false User data on success, false on failure
 */
function validateRememberToken($token) {
    global $conn;
    
    // Clean up expired tokens first
    $conn->query("DELETE FROM remember_tokens WHERE expires_at < NOW()");
    
    // Find valid token
    $stmt = $conn->prepare("SELECT rt.user_id, u.id, u.name, u.email 
                            FROM remember_tokens rt 
                            INNER JOIN users u ON rt.user_id = u.id 
                            WHERE rt.token = ? AND rt.expires_at > NOW() 
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
        return $user;
    }
    
    $stmt->close();
    return false;
}

/**
 * Delete a remember me token
 * @param string $token Token to delete
 * @return bool Success status
 */
function deleteRememberToken($token) {
    global $conn;
    
    $stmt = $conn->prepare("DELETE FROM remember_tokens WHERE token = ?");
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("s", $token);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}

/**
 * Delete all remember me tokens for a user
 * @param int $userId User ID
 * @return bool Success status
 */
function deleteAllUserTokens($userId) {
    global $conn;
    
    $stmt = $conn->prepare("DELETE FROM remember_tokens WHERE user_id = ?");
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("i", $userId);
    $result = $stmt->execute();
    $stmt->close();
    
    return $result;
}
?>

