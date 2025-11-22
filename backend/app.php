<?php
/**
 * Main Application Router
 * 
 * Handles routing for API endpoints
 */

header('Content-Type: application/json');

// Get route from query parameter
$route = $_GET['route'] ?? $_POST['route'] ?? null;

if (!$route) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Route parameter is required']);
    exit;
}

// Parse route (format: "controller/action")
$routeParts = explode('/', $route);
$controller = $routeParts[0] ?? null;
$action = $routeParts[1] ?? null;

if (!$controller || !$action) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid route format']);
    exit;
}

// Route to appropriate controller
switch ($controller) {
    case 'pages':
        require_once __DIR__ . '/pages.php';
        break;
    
    case 'menu':
        // Forward to menu.php with action parameter
        $_GET['action'] = $action;
        require_once __DIR__ . '/menu.php';
        break;
    
    case 'users':
        // Forward to users.php with action parameter
        $_GET['action'] = $action;
        require_once __DIR__ . '/users.php';
        break;
    
    case 'auth':
        // Handle auth routes
        if ($action === 'login') {
            require_once __DIR__ . '/login.php';
        } elseif ($action === 'register') {
            require_once __DIR__ . '/register.php';
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'Auth action not found']);
        }
        break;
    
    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Controller not found']);
        break;
}

