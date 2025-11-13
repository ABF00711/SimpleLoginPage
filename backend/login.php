<?php
// backend/login.php
header('Content-Type: application/json');
session_start();
require_once 'db.php';

// Read raw input (supports fetch/JSON requests)
$raw = file_get_contents('php://input');
$json = json_decode($raw, true);

// Accept identifier as username or email from either JSON or form POST
$identifier = $json['identifier'] ?? $_POST['identifier'] ?? $json['username'] ?? $_POST['username'] ?? null;
$password   = $json['password']   ?? $_POST['password']   ?? null;
$emailField = $json['email']      ?? $_POST['email']      ?? null;

// If email field was explicitly provided, treat it as identifier
if (!$identifier && $emailField) {
    $identifier = $emailField;
}

// Validate required login credentials
// User must provide either username or email along with password
if (!$identifier || !$password) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Please provide identifier (username or email) and password'
    ]);
    exit;
}

// Hash password to match stored MD5 hash (legacy compatibility)
$hashed = md5($password);

// SQL query allows login using either username OR email
$sql = "SELECT id, username, firstName, lastName 
        FROM users 
        WHERE (username = ? OR email = ?) AND password = ? 
        LIMIT 1";

$stmt = $conn->prepare($sql);

// If statement failed to prepare, return database error
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $conn->error]);
    exit;
}

// Bind parameters safely to prevent SQL injection
$stmt->bind_param("sss", $identifier, $identifier, $hashed);

// Execute query and check for execution errors
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

$result = $stmt->get_result();

// Handle unexpected query errors
if (!$result) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $stmt->error ?: $conn->error ?: 'Query failed'
    ]);
    exit;
}

// Check if user exists and password matched
if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();

    // Store user session info
    $_SESSION['loggedin']  = true;
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['username']  = $user['username'];
    $_SESSION['firstName'] = $user['firstName'];

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
