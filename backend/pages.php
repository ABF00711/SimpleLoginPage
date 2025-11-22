<?php
/**
 * Pages API
 * 
 * Returns page content for SPA routing
 */

header('Content-Type: application/json');
session_start();
require_once __DIR__ . '/db.php';

// Check authentication
if (!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// Get page name from request
$pageName = $_GET['page'] ?? $_POST['page'] ?? null;

if (!$pageName) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Page name is required']);
    exit;
}

// Whitelist of allowed pages (security)
$sql = "SELECT path FROM menu ORDER BY sort ASC";

$stmt = $conn->prepare($sql);
$stmt->execute();
$result = $stmt->get_result();
$menu = $result->fetch_all(MYSQLI_ASSOC);

$allowedPages = array_column($menu, 'path');

// Map page names to their PHP files
$pageFile = __DIR__ . '/../' . $pageName . '.php';

if (!file_exists($pageFile)) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Page not found']);
    exit;
}

// Set API mode flag to prevent layout inclusion
define('API_MODE', true);

// Set variables for the page
$pageTitle = ucfirst($pageName);
$pageStyles = [];
$pageScripts = [];

// Capture page output
ob_start();

// Include the page file
try {
    // Check if page file exists and is readable
    if (!is_readable($pageFile)) {
        throw new Exception('Page file is not readable');
    }
    
    // Include the page - it should set $content and $additionalHTML
    include $pageFile;
} catch (Exception $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error loading page: ' . $e->getMessage()]);
    exit;
} catch (Error $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error loading page: ' . $e->getMessage()]);
    exit;
}

// Get any output that was accidentally echoed
$output = ob_get_clean();

// Check if content was set
if (!isset($content)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Page did not set content variable. Output: ' . substr($output, 0, 200)]);
    exit;
}

// Return JSON response
echo json_encode([
    'status' => 'success',
    'content' => $content,
    'modals' => $additionalHTML ?? '',
    'scripts' => $pageScripts ?? []
], JSON_UNESCAPED_SLASHES);

