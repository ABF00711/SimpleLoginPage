<?php
header('Content-Type: application/json');
require_once "db.php";

mysqli_report(MYSQLI_REPORT_OFF);

$data = json_decode(file_get_contents("php://input"), true);

$username  = $data['username'] ?? '';
$password  = $data['password'] ?? '';
$email     = $data['email'] ?? '';

if (!$username || !$password || !$email) {
    echo json_encode(['status' => 'error', 'message' => 'Required fields missing']);
    exit;
}

$hashed = md5($password);

$stmt = $conn->prepare("INSERT INTO users (name, hashedpassword, email) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $username, $hashed, $email);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'User created']);
} else {
    $err = $conn->error;

    if ($conn->errno === 1062) {
        if (strpos($err, 'username') !== false) {
            $msg = 'Username already exists';
        } elseif (strpos($err, 'email') !== false) {
            $msg = 'Email already exists';
        } else {
            $msg = 'Duplicate value';
        }

        echo json_encode(['status' => 'error', 'message' => $msg]);
    } else {
        echo json_encode(['status' => 'error', 'message' => $err]);
    }
}

$stmt->close();
$conn->close();
?>
