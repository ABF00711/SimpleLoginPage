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
    
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    
    // Get action from JSON body first, then GET, then POST
    $action = $json['action'] ?? $_GET['action'] ?? $_POST['action'] ?? null;
    
    switch ($action) {
        case 'getMFA':
            handleGetMFA();
            break;
        case 'getUserInfo':
            handleGetUserInfo();
            break;
        case 'updateUserInfo':
            handleUpdateUserInfo($json);
            break;
        case 'changePassword':
            handleChangePassword($json);
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

/**
 * Get current user information
 */
function handleGetUserInfo() {
    global $conn;
    
    $userId = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("SELECT name, email FROM users WHERE id = ? LIMIT 1");
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
        'username' => $user['name'],
        'email' => $user['email']
    ]);
}

/**
 * Update user information (username and email)
 */
function handleUpdateUserInfo($data) {
    global $conn;
    
    $userId = $_SESSION['user_id'];
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    
    // Validate inputs
    if (empty($username) || empty($email)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Username and email are required'
        ]);
        exit;
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        exit;
    }
    
    // Get current user info to check if values are actually changing
    $currentStmt = $conn->prepare("SELECT name, email FROM users WHERE id = ? LIMIT 1");
    if (!$currentStmt) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $conn->error
        ]);
        exit;
    }
    
    $currentStmt->bind_param("i", $userId);
    if (!$currentStmt->execute()) {
        $currentStmt->close();
        ob_end_clean();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $currentStmt->error
        ]);
        exit;
    }
    
    $currentResult = $currentStmt->get_result();
    if ($currentResult->num_rows === 0) {
        $currentStmt->close();
        ob_end_clean();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
        exit;
    }
    
    $currentUser = $currentResult->fetch_assoc();
    $currentStmt->close();
    
    // Check if username already exists (only if it's different from current)
    if ($username !== $currentUser['name']) {
        $checkUsernameStmt = $conn->prepare("SELECT id FROM users WHERE name = ? AND id != ? LIMIT 1");
        if (!$checkUsernameStmt) {
            ob_end_clean();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $conn->error
            ]);
            exit;
        }
        
        $checkUsernameStmt->bind_param("si", $username, $userId);
        if (!$checkUsernameStmt->execute()) {
            $checkUsernameStmt->close();
            ob_end_clean();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $checkUsernameStmt->error
            ]);
            exit;
        }
        
        $checkUsernameResult = $checkUsernameStmt->get_result();
        if ($checkUsernameResult->num_rows > 0) {
            $checkUsernameStmt->close();
            ob_end_clean();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'This username is already existing'
            ]);
            exit;
        }
        $checkUsernameStmt->close();
    }
    
    // Check if email already exists (only if it's different from current)
    if ($email !== $currentUser['email']) {
        $checkEmailStmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
        if (!$checkEmailStmt) {
            ob_end_clean();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $conn->error
            ]);
            exit;
        }
        
        $checkEmailStmt->bind_param("si", $email, $userId);
        if (!$checkEmailStmt->execute()) {
            $checkEmailStmt->close();
            ob_end_clean();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $checkEmailStmt->error
            ]);
            exit;
        }
        
        $checkEmailResult = $checkEmailStmt->get_result();
        if ($checkEmailResult->num_rows > 0) {
            $checkEmailStmt->close();
            ob_end_clean();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'This email is already existing'
            ]);
            exit;
        }
        $checkEmailStmt->close();
    }
    
    // Update user information
    $updateStmt = $conn->prepare("UPDATE users SET name = ?, email = ? WHERE id = ?");
    if (!$updateStmt) {
        ob_end_clean();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $conn->error
        ]);
        exit;
    }
    
    $updateStmt->bind_param("ssi", $username, $email, $userId);
    
    if (!$updateStmt->execute()) {
        $error = $updateStmt->error;
        $errno = $conn->errno;
        $updateStmt->close();
        
        // Handle duplicate key error (MySQL error 1062)
        if ($errno === 1062) {
            // Determine which field caused the duplicate
            $errorMsg = $conn->error;
            if (stripos($errorMsg, 'name') !== false || stripos($errorMsg, 'username') !== false) {
                $message = 'This username is already existing';
            } elseif (stripos($errorMsg, 'email') !== false) {
                $message = 'This email is already existing';
            } else {
                $message = 'Username or email already exists';
            }
            
            ob_end_clean();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => $message
            ]);
        } else {
            ob_end_clean();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $error
            ]);
        }
        exit;
    }
    
    // Update session
    $_SESSION['username'] = $username;
    $_SESSION['email'] = $email;
    
    $updateStmt->close();
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => 'User information updated successfully'
    ]);
}

/**
 * Change user password (requires current password)
 */
function handleChangePassword($data) {
    global $conn;
    
    $userId = $_SESSION['user_id'];
    $currentPassword = $data['currentPassword'] ?? '';
    $newPassword = $data['newPassword'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';
    
    // Validate inputs
    if (empty($currentPassword) || empty($newPassword) || empty($confirmPassword)) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'All password fields are required'
        ]);
        exit;
    }
    
    // Check if new password matches confirmation
    if ($newPassword !== $confirmPassword) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'New password and confirmation do not match'
        ]);
        exit;
    }
    
    // Validate password length (minimum 6 characters)
    if (strlen($newPassword) < 6) {
        ob_end_clean();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'New password must be at least 6 characters long'
        ]);
        exit;
    }
    
    // Verify current password
    $hashedCurrentPassword = md5($currentPassword);
    $verifyStmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND hashedpassword = ? LIMIT 1");
    if (!$verifyStmt) {
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $verifyStmt->bind_param("is", $userId, $hashedCurrentPassword);
    $verifyStmt->execute();
    $verifyResult = $verifyStmt->get_result();
    
    if ($verifyResult->num_rows === 0) {
        $verifyStmt->close();
        ob_end_clean();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Current password is incorrect'
        ]);
        exit;
    }
    $verifyStmt->close();
    
    // Update password
    $hashedNewPassword = md5($newPassword);
    $updateStmt = $conn->prepare("UPDATE users SET hashedpassword = ? WHERE id = ?");
    if (!$updateStmt) {
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $updateStmt->bind_param("si", $hashedNewPassword, $userId);
    
    if ($updateStmt->execute()) {
        $updateStmt->close();
        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    } else {
        $error = $updateStmt->error;
        $updateStmt->close();
        throw new Exception('Database error: ' . $error);
    }
}
?>

