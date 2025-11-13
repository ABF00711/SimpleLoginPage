<?php
header('Content-Type: application/json');
require_once "db.php";

// Disable strict MySQL exception mode to manually handle duplicate errors
mysqli_report(MYSQLI_REPORT_OFF);

// Decode JSON request body
$data = json_decode(file_get_contents("php://input"), true);

// Extract input fields or set empty defaults
$username  = $data['username'] ?? '';
$password  = $data['password'] ?? '';
$firstName = $data['firstName'] ?? '';
$lastName  = $data['lastName'] ?? '';
$address   = $data['address'] ?? '';
$email     = $data['email'] ?? '';

// Validate required fields
// All fields must be provided in order to register a new user
if (!$username || !$password || !$email || !$firstName || !$lastName || !$address) {
    echo json_encode(['status' => 'error', 'message' => 'Required fields missing']);
    exit;
}

// Hash the password before storing it in the database
$hashed = md5($password);

// Prepare the SQL insert query using prepared statements to prevent SQL injection
$stmt = $conn->prepare("INSERT INTO users (username, password, firstName, lastName, address, email) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssssss", $username, $hashed, $firstName, $lastName, $address, $email);

// Execute query and handle possible errors
if ($stmt->execute()) {
    // Insert successful
    echo json_encode(['status' => 'success', 'message' => 'User created']);
} else {
    // Get error from MySQL
    $err = $conn->error;

    // Handle duplicate unique field errors
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
        // Any other database error
        echo json_encode(['status' => 'error', 'message' => $err]);
    }
}

// Close resources
$stmt->close();
$conn->close();
?>
