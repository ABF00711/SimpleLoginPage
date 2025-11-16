<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "beornnotes";

// Create connection
$conn = new mysqli($host, $user, $pass, $db);

// Check connection
if ($conn->connect_error) {
    die(json_encode([
        "status"  => "error",
        "message" => "Database connection failed"
    ]));
}

// Set charset to avoid Arabic issues
$conn->set_charset("utf8");
?>
