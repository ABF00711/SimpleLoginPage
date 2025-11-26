<?php
/**
 * Example API endpoint for Table Module
 * This demonstrates how to serve data to the table module via AJAX
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust for production

// Database connection (example)
/*
$conn = new mysqli("localhost", "username", "password", "database");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}
*/

// Get action parameter
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getUsers':
        // Simulated database query
        // In production: $result = $conn->query("SELECT * FROM users");
        
        $users = [
            ['id' => 1, 'username' => 'admin', 'email' => 'admin@example.com', 'role' => 'Administrator'],
            ['id' => 2, 'username' => 'john_doe', 'email' => 'john@example.com', 'role' => 'User'],
            ['id' => 3, 'username' => 'jane_smith', 'email' => 'jane@example.com', 'role' => 'Moderator'],
        ];
        
        echo json_encode($users);
        break;
        
    case 'getProducts':
        // Example: Another endpoint
        $products = [
            ['id' => 1, 'name' => 'Product A', 'price' => 29.99, 'stock' => 100],
            ['id' => 2, 'name' => 'Product B', 'price' => 49.99, 'stock' => 50],
        ];
        
        echo json_encode($products);
        break;
        
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

// Close database connection if opened
// $conn->close();
?>

