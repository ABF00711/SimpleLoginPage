<?php
// Return JSON
header('Content-Type: application/json');

// Load DB connection
require "db.php";

// Read JSON body from POST request
$data = json_decode(file_get_contents("php://input"), true);

// Extract IDs array
$ids = $data['ids'] ?? [];

// Validate IDs exist and are array
if(!$ids || !is_array($ids)) {
    echo json_encode(["status"=>"error","message"=>"No IDs"]);
    exit;
}

// Convert IDs to integers for safety
$ids = array_map('intval', $ids);

// Create comma-separated ID string for SQL
$idList = implode(',', $ids);

// Delete users by IDs
$sql = "DELETE FROM users WHERE id IN ($idList)";

// Execute delete and send response
if ($conn->query($sql)) {
    echo json_encode(["status"=>"success","message"=>"Users deleted"]);
} else {
    echo json_encode(["status"=>"error","message"=>$conn->error]);
}
?>
