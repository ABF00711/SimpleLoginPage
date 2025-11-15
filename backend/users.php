<?php
/**
 * Unified User Management API
 * Handles: GET (list), EDIT, and DELETE operations
 * Route via 'action' parameter: getUsers, editUser, deleteUsers
 */

header('Content-Type: application/json');
require_once 'db.php';

// Disable strict MySQL exception mode for duplicate error handling
mysqli_report(MYSQLI_REPORT_OFF);

// Extract action from GET or POST
$action = $_GET['action'] ?? $_POST['action'] ?? null;

// Default response template
$response = ['status' => 'error', 'message' => 'Invalid request'];

try {
    switch ($action) {
        case 'getUsers':
            handleGetUsers();
            break;

        case 'editUser':
            handleEditUser();
            break;

        case 'deleteUsers':
            handleDeleteUsers();
            break;

        default:
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Action not specified or invalid']);
            exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
}

/**
 * Get all users from the database
 */
function handleGetUsers() {
    global $conn;

    // Validate database connection
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Connection failed: ' . $conn->connect_error
        ]);
        exit;
    }

    // Fetch users list
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
        'status' => 'success',
        'count' => count($users),
        'data' => $users
    ], JSON_PRETTY_PRINT);
}

/**
 * Edit/Update user profile data (supports partial updates)
 */
function handleEditUser() {
    global $conn;

    // Decode JSON request body
    $data = json_decode(file_get_contents('php://input'), true);

    // Validate required user ID field
    $id = $data['id'] ?? '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'User ID is required']);
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
    // Note: MD5 is used here only for compatibility (should be upgraded to password_hash later)
    if (!empty($data['password'])) {
        $updateParts[] = "password=?";
        $params[] = md5($data['password']);
        $types .= "s";
    }

    // If no valid fields submitted
    if (empty($updateParts)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No fields to update']);
        exit;
    }

    // Final update query with WHERE id
    $sql = "UPDATE users SET " . implode(", ", $updateParts) . " WHERE id=?";
    $params[] = $id;
    $types .= "i"; // id is integer

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Query preparation failed: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param($types, ...$params);

    // Execute update
    if ($stmt->execute()) {
        // Check if any rows were actually updated
        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'User updated']);
        } else {
            echo json_encode(['status' => 'info', 'message' => 'No changes or user not found']);
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

            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => $msg]);
        } else {
            // Other SQL error
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $conn->error]);
        }
    }

    // Cleanup
    $stmt->close();
}

/**
 * Delete multiple users by their IDs
 */
function handleDeleteUsers() {
    global $conn;

    // Read JSON body from POST request
    $data = json_decode(file_get_contents('php://input'), true);

    // Extract IDs array
    $ids = $data['ids'] ?? [];

    // Validate IDs exist and are array
    if (!$ids || !is_array($ids)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'No IDs provided']);
        exit;
    }

    // Convert IDs to integers for safety
    $ids = array_map('intval', $ids);

    // Filter out any zero or negative values
    $ids = array_filter($ids, function($id) { return $id > 0; });

    if (empty($ids)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid IDs']);
        exit;
    }

    // Create comma-separated ID string for SQL IN clause
    $idList = implode(',', $ids);

    // Delete users by IDs using prepared statement is safer, but for integer lists this is acceptable
    $sql = "DELETE FROM users WHERE id IN ($idList)";

    // Execute delete and send response
    if ($conn->query($sql)) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Users deleted',
            'deletedCount' => $conn->affected_rows
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $conn->error]);
    }
}

// Close connection at the end
$conn->close();
?>
