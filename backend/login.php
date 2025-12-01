<?php
header('Content-Type: application/json');
session_start();
require_once 'db.php';
require_once 'remember-me.php';

$raw = file_get_contents('php://input');
$json = json_decode($raw, true);

$identifier = $json['identifier'] ?? $_POST['identifier'] ?? $json['username'] ?? $_POST['username'] ?? null;
$password   = $json['password']   ?? $_POST['password']   ?? null;
$emailField = $json['email']      ?? $_POST['email']      ?? null;
$rememberMe = $json['remember_me'] ?? $_POST['remember_me'] ?? false;

if (!$identifier && $emailField) {
    $identifier = $emailField;
}

if (!$identifier || !$password) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Please provide identifier (username or email) and password'
    ]);
    exit;
}

$hashed = md5($password);

// Check if mfa column exists, if not, don't select it
$sql = "SELECT id, name, email 
        FROM users 
        WHERE (name = ? OR email = ?) AND hashedpassword = ? 
        LIMIT 1";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $conn->error]);
    exit;
}

$stmt->bind_param("sss", $identifier, $identifier, $hashed);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

$result = $stmt->get_result();

if (!$result) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $stmt->error ?: $conn->error ?: 'Query failed'
    ]);
    exit;
}

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    
    // Check if mfa column exists by trying to query it separately
    $mfaEnabled = false;
    $checkMfaStmt = $conn->prepare("SELECT mfa FROM users WHERE id = ? LIMIT 1");
    if ($checkMfaStmt) {
        $checkMfaStmt->bind_param("i", $user['id']);
        if ($checkMfaStmt->execute()) {
            $mfaResult = $checkMfaStmt->get_result();
            if ($mfaResult && $mfaResult->num_rows > 0) {
                $mfaRow = $mfaResult->fetch_assoc();
                $mfaEnabled = isset($mfaRow['mfa']) && $mfaRow['mfa'] == 1;
            }
        }
        $checkMfaStmt->close();
    }
    
    $mfaCode = $json['mfa_code'] ?? $_POST['mfa_code'] ?? null;
    
    // If 2FA is enabled, verify code before completing login
    if ($mfaEnabled) {
        if (!$mfaCode) {
            // 2FA required but code not provided
            echo json_encode([
                'success' => false,
                'requires_2fa' => true,
                'message' => 'Please enter your 2FA code'
            ]);
            $stmt->close();
            $conn->close();
            exit;
        }
        
        // Verify 2FA code
        require_once __DIR__ . '/two-factor.php';
        if (!function_exists('verifyTOTPCodeForUser')) {
            // If function doesn't exist, include the file
            require_once __DIR__ . '/two-factor.php';
        }
        $isValid = verifyTOTPCodeForUser($user['id'], $mfaCode);
        
        if (!$isValid) {
            echo json_encode([
                'success' => false,
                'requires_2fa' => true,
                'message' => 'Invalid 2FA code'
            ]);
            $stmt->close();
            $conn->close();
            exit;
        }
    }

    $_SESSION['loggedin']  = true;
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['username']  = $user['name'];
    $_SESSION['email'] = $user['email'];

    // Handle "Remember Me" functionality
    if ($rememberMe) {
        $token = createRememberToken($user['id']);
        if ($token) {
            // Set cookie for 30 days
            // Using httponly and secure flags for security
            $cookieName = 'remember_me_token';
            $cookieValue = $token;
            $expireTime = time() + (30 * 24 * 60 * 60); // 30 days
            $path = '/';
            $domain = ''; // Current domain
            $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on'; // HTTPS only if available
            $httponly = true; // Prevent JavaScript access
            
            setcookie($cookieName, $cookieValue, $expireTime, $path, $domain, $secure, $httponly);
        }
    }

    echo json_encode(['success' => true]);
} else {
    // Wrong credentials
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Wrong username/email or password'
    ]);
}

// Close resources
$stmt->close();
$conn->close();
?>
