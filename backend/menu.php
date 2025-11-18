<?php


header('Content-Type: application/json');
session_start();
require_once 'db.php';

// Disable strict MySQL exception mode for duplicate error handling
mysqli_report(MYSQLI_REPORT_OFF);

// Extract action from GET or POST
$action = $_GET['action'] ?? $_POST['action'] ?? null;
// Default response template
$response = ['status' => 'error', 'message' => 'Invalid request'];

try {
    switch ($action) {
        case 'getMenu':
            handleGetMenu();
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

function handleGetMenu () {
    global $conn;

    // Try to get username from session or request
    $username = null;
    if (!empty($_SESSION['username'])) {
        $username = $_SESSION['username'];
    }

    // Allow username via GET or POST (JSON body)
    if (isset($_GET['username'])) $username = $_GET['username'];
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if (!$username && !empty($json['username'])) $username = $json['username'];

    // If still no username, return an error
    if (!$username) {
        http_response_code(400);
        echo json_encode(['status'=>'error','message'=>'username is required']);
        return;
    }

    // Find user id by username (try both 'username' and 'name' columns)
    
    $userId = null;
    $sql = "SELECT id FROM users WHERE name = ? LIMIT 1";
    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param('s', $username);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res && $res->num_rows > 0) {
            $row = $res->fetch_assoc();
            $userId = (int)$row['id'];
        }
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(['status'=>'error','message'=>'DB prepare failed: '.$conn->error]);
        return;
    }
    error_log("DEBUG: getMenu action started.");

    if (!$userId) {
        // Unknown user -> default to role 1
        $role_id = 1;
    } else {
        // Lookup role for user
        $role_id = 1; // default
        $sql = "SELECT role_id FROM user_roles WHERE user_id = ? LIMIT 1";
        if ($stmt = $conn->prepare($sql)) {
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res && $res->num_rows > 0) {
                $r = $res->fetch_assoc();
                $role_id = (int)$r['role_id'];
            }
            $stmt->close();
        } else {
            http_response_code(500);
            echo json_encode(['status'=>'error','message'=>'DB prepare failed: '.$conn->error]);
            return;
        }
    }

    // Get allowed menu_ids for this role
    $menuRoleIds = [];
    $sql = "SELECT menu_id FROM menu_roles WHERE role_id = ?";
    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param('i', $role_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $menuRoleIds[] = (int)$row['menu_id'];
            }
        }
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(['status'=>'error','message'=>'DB prepare failed: '.$conn->error]);
        return;
    }

    // Fetch only allowed menu items (via JOIN) with minimal fields needed for rendering
    $user_menu = [];
    $sql = "SELECT DISTINCT m.id, m.title, m.path, m.parent_id, m.sort
            FROM menu m
            INNER JOIN menu_roles mr ON mr.menu_id = m.id
            WHERE mr.role_id = ?
            ORDER BY m.sort ASC";
    
    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param('i', $role_id);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $user_menu[] = [
                    'id' => (int)$row['id'],
                    'title' => $row['title'],
                    'path' => $row['path'],
                    'parent_id' => $row['parent_id'] ? (int)$row['parent_id'] : null,
                    'sort' => (int)$row['sort']
                ];
            }
        }
        $stmt->close();
    } else {
        http_response_code(500);
        echo json_encode(['status'=>'error','message'=>'DB prepare failed: '.$conn->error]);
        return;
    }

    echo json_encode(['status'=>'success','message'=>'getMenu success','user_menu'=>$user_menu], JSON_PRETTY_PRINT);
}

?>