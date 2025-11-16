<?php
header('Content-Type: application/json');
session_start();
require_once 'db.php';

$raw = file_get_contents('php://input');
$json = json_decode($raw, true);

$identifier = $json['identifier'] ?? $_POST['identifier'] ?? $json['username'] ?? $_POST['username'] ?? null;
$password   = $json['password']   ?? $_POST['password']   ?? null;
$emailField = $json['email']      ?? $_POST['email']      ?? null;

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

    $_SESSION['loggedin']  = true;
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['username']  = $user['name'];
    $_SESSION['email'] = $user['email'];

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
