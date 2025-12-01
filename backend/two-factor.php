<?php
/**
 * Two-Factor Authentication API
 * Handles 2FA setup, code generation, and verification
 */

// Only execute API endpoint logic if this file is called directly (not included)
// Check if this is a direct request by looking at the script name
$isDirectRequest = basename($_SERVER['SCRIPT_NAME']) === 'two-factor.php';

if ($isDirectRequest) {
    header('Content-Type: application/json');
    
    // Start output buffering
    ob_start();
    
    try {
        require_once __DIR__ . '/db.php';
        
        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Check if user is logged in (only for direct API calls)
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
        $action = $json['action'] ?? $_POST['action'] ?? null;
        
        switch ($action) {
            case 'toggle':
                handleToggle2FA($json);
                break;
            case 'verify':
                handleVerifyCode($json);
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
    exit;
}

// If included, just load the database connection and make functions available
if (!isset($conn)) {
    require_once __DIR__ . '/db.php';
}

/**
 * Toggle 2FA on/off
 */
function handleToggle2FA($data) {
    global $conn;
    
    $userId = $_SESSION['user_id'];
    $enable = $data['enable'] ?? false;
    $mfaValue = $enable ? 1 : 0;
    
    // Get user info for QR code
    $userStmt = $conn->prepare("SELECT name, email, secret FROM users WHERE id = ? LIMIT 1");
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $user = $userResult->fetch_assoc();
    $userStmt->close();
    
    // If enabling, generate and store secret
    if ($enable) {
        // Generate secret if doesn't exist
        if (empty($user['secret'])) {
            $secret = generateTOTPSecret();
            $stmt = $conn->prepare("UPDATE users SET mfa = ?, secret = ? WHERE id = ?");
            if (!$stmt) {
                throw new Exception('Database error: ' . $conn->error);
            }
            $stmt->bind_param("isi", $mfaValue, $secret, $userId);
        } else {
            // Use existing secret
            $secret = $user['secret'];
            $stmt = $conn->prepare("UPDATE users SET mfa = ? WHERE id = ?");
            if (!$stmt) {
                throw new Exception('Database error: ' . $conn->error);
            }
            $stmt->bind_param("ii", $mfaValue, $userId);
        }
    } else {
        // Disabling - just update mfa field (keep secret for re-enabling)
        $secret = null;
        $stmt = $conn->prepare("UPDATE users SET mfa = ? WHERE id = ?");
        if (!$stmt) {
            throw new Exception('Database error: ' . $conn->error);
        }
        $stmt->bind_param("ii", $mfaValue, $userId);
    }
    
    if (!$stmt->execute()) {
        throw new Exception('Database error: ' . $stmt->error);
    }
    
    $stmt->close();
    
    // Generate TOTP URI if enabling (for client-side QR code generation)
    $totpUri = null;
    if ($enable && $secret) {
        $accountName = $user['email'] ?? $user['name'];
        $totpUri = generateTOTPURI($accountName, $secret);
    }
    
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => $enable ? '2FA enabled successfully' : '2FA disabled successfully',
        'mfa' => $mfaValue,
        'secret' => $enable ? $secret : null,
        'totpUri' => $totpUri
    ]);
}

/**
 * Verify 2FA code during login
 */
function handleVerifyCode($data) {
    global $conn;
    
    $identifier = $data['identifier'] ?? null;
    $code = $data['code'] ?? null;
    
    if (!$identifier || !$code) {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Identifier and code are required'
        ]);
        exit;
    }
    
    // Find user
    $sql = "SELECT id, name, email, secret FROM users WHERE name = ? OR email = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Database error: ' . $conn->error);
    }
    
    $stmt->bind_param("ss", $identifier, $identifier);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Verify code
    $isValid = verifyTOTPCode($user['secret'], $code);
    
    if ($isValid) {
        ob_end_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Code verified successfully'
        ]);
    } else {
        ob_end_clean();
        echo json_encode([
            'success' => false,
            'message' => 'Invalid verification code'
        ]);
    }
}

/**
 * Generate TOTP secret for user
 */
function generateTOTPSecret() {
    // Generate a random 32-character base32 secret
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 alphabet
    $secret = '';
    for ($i = 0; $i < 32; $i++) {
        $secret .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $secret;
}

/**
 * Verify TOTP code for a user (used during login)
 * @param int $userId User ID
 * @param string $code The code to verify
 * @return bool True if valid, false otherwise
 */
function verifyTOTPCodeForUser($userId, $code) {
    global $conn;
    
    $sql = "SELECT secret FROM users WHERE id = ? LIMIT 1";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        return false;
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    return verifyTOTPCode($user['secret'], $code);
}

/**
 * Verify TOTP code
 * @param string $secret The TOTP secret
 * @param string $code The code to verify
 * @return bool True if valid, false otherwise
 */
function verifyTOTPCode($secret, $code) {
    if (empty($secret) || empty($code)) {
        return false;
    }
    
    // Get current time step (30 second intervals)
    $timeStep = floor(time() / 30);
    
    // Check current time step and adjacent time steps (for clock skew tolerance)
    for ($i = -1; $i <= 1; $i++) {
        $checkTimeStep = $timeStep + $i;
        $expectedCode = generateTOTPCode($secret, $checkTimeStep);
        
        if (hash_equals($expectedCode, $code)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Generate TOTP code for a given time step
 * @param string $secret The TOTP secret (base32)
 * @param int $timeStep The time step
 * @return string 6-digit code
 */
function generateTOTPCode($secret, $timeStep) {
    // Decode base32 secret
    $secretBytes = base32Decode($secret);
    
    // Pack time step as 8-byte big-endian
    $time = pack('N*', 0) . pack('N*', $timeStep);
    
    // Generate HMAC-SHA1
    $hash = hash_hmac('sha1', $time, $secretBytes, true);
    
    // Dynamic truncation
    $offset = ord($hash[19]) & 0x0f;
    $code = (
        ((ord($hash[$offset + 0]) & 0x7f) << 24) |
        ((ord($hash[$offset + 1]) & 0xff) << 16) |
        ((ord($hash[$offset + 2]) & 0xff) << 8) |
        (ord($hash[$offset + 3]) & 0xff)
    ) % 1000000;
    
    return str_pad($code, 6, '0', STR_PAD_LEFT);
}

/**
 * Decode base32 string
 */
function base32Decode($input) {
    $input = strtoupper($input);
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    
    for ($i = 0; $i < strlen($input); $i++) {
        $val = strpos($chars, $input[$i]);
        if ($val === false) continue;
        $bits .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
    }
    
    $bytes = '';
    for ($i = 0; $i < strlen($bits); $i += 8) {
        $byte = substr($bits, $i, 8);
        if (strlen($byte) < 8) break;
        $bytes .= chr(bindec($byte));
    }
    
    return $bytes;
}

/**
 * Generate TOTP URI for QR code
 * @param string $accountName User's email or username
 * @param string $secret TOTP secret
 * @return string TOTP URI string
 */
function generateTOTPURI($accountName, $secret) {
    // Generate TOTP URI in the format: otpauth://totp/Issuer:Account?secret=SECRET&issuer=Issuer
    $issuer = 'BeornNotes';
    $encodedAccount = urlencode($accountName);
    $encodedIssuer = urlencode($issuer);
    $otpauthUrl = "otpauth://totp/{$encodedIssuer}:{$encodedAccount}?secret={$secret}&issuer={$encodedIssuer}";
    
    return $otpauthUrl;
}
?>

