<?php
// Return all registered users in JSON format
header('Content-Type: application/json');
require_once "db.php";

// Validate database connection
if ($conn->connect_error) {
    echo json_encode([
        "status" => "error",
        "message" => "Connection failed: " . $conn->connect_error
    ]);
    exit;
}

// Fetch users list
// Note: `email` was repeated in SELECT, removed duplicate
$sql = "SELECT id, email, username, firstName, lastName, address FROM users";
$result = $conn->query($sql);

// Array to store fetched users
$users = [];

// If results exist, push each row into array
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
}

// Respond with user list and count
echo json_encode([
    "status" => "success",
    "count" => count($users),
    "data" => $users
], JSON_PRETTY_PRINT);

// Close DB connection
$conn->close();
?>
