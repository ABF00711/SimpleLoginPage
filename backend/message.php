<?php
/**
 * Message API
 * Fetches message from message table to display in the application
 */

header('Content-Type: application/json');

// Start output buffering to prevent any output before JSON
ob_start();

try {
    // Database connection
    require_once __DIR__ . '/db.php';
    
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Check if user is authenticated (optional - you may want to show messages to all users)
    // For now, we'll fetch messages regardless of authentication
    
    // Fetch message from message table where name = 'session'
    $sql = "SELECT id, name, description FROM message WHERE name = 'session' LIMIT 1";
    $result = $conn->query($sql);
    
    if (!$result) {
        throw new Exception('Failed to execute query: ' . $conn->error);
    }
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo json_encode([
            'status' => 'success',
            'data' => [
                'id' => $row['id'],
                'name' => $row['name'],
                'description' => $row['description']
            ]
        ]);
    } else {
        // No message found
        echo json_encode([
            'status' => 'success',
            'data' => null
        ]);
    }
    
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
} catch (Error $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

// Clean output buffer and send JSON
ob_end_flush();

if (isset($conn)) {
    $conn->close();
}
?>

