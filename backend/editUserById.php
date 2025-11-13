<?php
// Update user profile data (supports partial updates)
header('Content-Type: application/json');
require_once "db.php";

// Disable MySQL exception mode to manually handle duplicate entry errors
mysqli_report(MYSQLI_REPORT_OFF);

// Decode JSON request body
$data = json_decode(file_get_contents("php://input"), true);

// Validate required user ID field
$id = $data['id'] ?? '';
if (!$id) {
    echo json_encode(['status'=>'error','message'=>'User ID is required']);
    exit;
}

// Accepted fields for update
$fields = [
    'username',
    'firstName',
    'lastName',
    'address',
    'email'
];

$updateParts = [];
$params = [];
$types = "";

// Build update query dynamically based on non-empty fields
foreach ($fields as $field) {
    if (!empty($data[$field])) {
        $updateParts[] = "$field=?";
        $params[] = $data[$field];
        $types .= "s"; // string type
    }
}

// Handle password update if provided
// Note: MD5 is used here only for compatibility (should be upgraded later)
if (!empty($data['password'])) {
    $updateParts[] = "password=?";
    $params[] = md5($data['password']);
    $types .= "s";
}

// If no valid fields submitted
if (empty($updateParts)) {
    echo json_encode(['status'=>'error','message'=>'No fields to update']);
    exit;
}

// Final update query with WHERE id
$sql = "UPDATE users SET " . implode(", ", $updateParts) . " WHERE id=?";
$params[] = $id;
$types .= "i"; // id is integer

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

// Execute update
if ($stmt->execute()) {

    // Check if any rows were actually updated
    if ($stmt->affected_rows > 0) {
        echo json_encode(['status'=>'success','message'=>'User updated']);
    } else {
        echo json_encode(['status'=>'info','message'=>'No changes or user not found']);
    }

} else {
    // Handle unique constraint errors (duplicate username/email)
    if ($conn->errno === 1062) {
        $err = $conn->error;

        if (strpos($err, 'username') !== false) {
            $msg = 'Username already exists';
        } elseif (strpos($err, 'email') !== false) {
            $msg = 'Email already exists';
        } else {
            $msg = 'Duplicate value';
        }

        echo json_encode(['status'=>'error','message'=>$msg]);
    } else {
        // Other SQL error
        echo json_encode(['status'=>'error','message'=>$conn->error]);
    }
}

// Cleanup
$stmt->close();
$conn->close();
?>
