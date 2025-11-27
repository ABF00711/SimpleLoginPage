<?php

header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

// Get action from request (check GET, POST first)
$action = $_GET['action'] ?? $_POST['action'] ?? null;

// For POST requests, read JSON body once and store it
$jsonBody = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === null) {
    $jsonInput = file_get_contents('php://input');
    $jsonBody = json_decode($jsonInput, true);
    $action = $jsonBody['action'] ?? null;
}

// Default to 'get' for backward compatibility
$action = $action ?? 'get';

// Route to appropriate handler
switch ($action) {
    case 'get':
        handleGetTableData();
        break;
    case 'delete':
        handleDeleteTableData($jsonBody);
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid action. Use "get" or "delete"'
        ]);
        exit;
}

/**
 * Handle GET request - fetch table data
 */
function handleGetTableData() {
    global $conn;
    
    // Get form name from request
    $formName = $_GET['formName'] ?? '';

    if (empty($formName)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'FormName parameter is required'
        ]);
        exit;
    }

    try {
        $formSql = "SELECT FormName, `Select` as SelectQuery, TableView, WhereClause, OrderBy 
                    FROM forms 
                    WHERE FormName = ? 
                    LIMIT 1";
        
        $stmt = $conn->prepare($formSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare form query: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $formName);
        $stmt->execute();
        $formResult = $stmt->get_result();
        
        if ($formResult->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Form not found: ' . $formName
            ]);
            exit;
        }
        
        $form = $formResult->fetch_assoc();
        $stmt->close();
        
        $tableView = $form['TableView'];
        $selectQuery = $form['SelectQuery'];
        $whereClause = $form['WhereClause'];
        $orderBy = $form['OrderBy'];
        
        $columnsSql = "SELECT field_label, field_name, field_type 
                       FROM data_config 
                       WHERE table_name = ? 
                       ORDER BY id";
        
        $stmt = $conn->prepare($columnsSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare columns query: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $tableView);
        $stmt->execute();
        $columnsResult = $stmt->get_result();
        
        $columns = [];
        while ($row = $columnsResult->fetch_assoc()) {
            $columnType = $row['field_type'];
            if ($columnType === 'combobox') {
                $columnType = 'text';
            }
            
            $columns[] = [
                'column_name' => $row['field_name'],
                'column_label' => $row['field_label'],
                'column_type' => $columnType
            ];
        }
        $stmt->close();
        
        // Step 3: Build and execute the data query
        $dataQuery = $selectQuery;
        
        // Add WHERE clause if exists and not NULL
        if (!empty($whereClause) && strtoupper(trim($whereClause)) !== 'NULL' && trim($whereClause) !== '(NULL)') {
            $dataQuery .= " WHERE " . $whereClause;
        }
        
        // Add ORDER BY clause if exists and not NULL
        if (!empty($orderBy) && strtoupper(trim($orderBy)) !== 'NULL' && trim($orderBy) !== '(NULL)') {
            $dataQuery .= " ORDER BY " . $orderBy;
        }
        
        // Execute data query
        $dataResult = $conn->query($dataQuery);
        
        if (!$dataResult) {
            throw new Exception('Failed to execute data query: ' . $conn->error);
        }
        
        $data = [];
        while ($row = $dataResult->fetch_assoc()) {
            $data[] = $row;
        }
        
        // Return response
        echo json_encode([
            'status' => 'success',
            'columns' => $columns,
            'data' => $data,
            'form' => [
                'formName' => $form['FormName'],
                'tableView' => $tableView
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    } catch (Error $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
}

/**
 * Handle DELETE request - delete table rows
 */
function handleDeleteTableData($jsonBody = null) {
    global $conn;
    
    try {
        // Use provided JSON body or read from input stream
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
            
            // Check if JSON was parsed correctly
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON: ' . json_last_error_msg());
            }
        } else {
            $data = $jsonBody;
        }
        
        // Get form name and rows to delete
        $formName = $data['formName'] ?? '';
        $rowsToDelete = $data['rows'] ?? [];
        
        if (empty($formName)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'FormName is required'
            ]);
            exit;
        }
        
        if (empty($rowsToDelete) || !is_array($rowsToDelete)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Rows to delete are required and must be an array'
            ]);
            exit;
        }
        
        // Get form and table information
        $formSql = "SELECT FormName, TableView 
                    FROM forms 
                    WHERE FormName = ? 
                    LIMIT 1";
        
        $stmt = $conn->prepare($formSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare form query: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $formName);
        $stmt->execute();
        $formResult = $stmt->get_result();
        
        if ($formResult->num_rows === 0) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'message' => 'Form not found: ' . $formName
            ]);
            $stmt->close();
            exit;
        }
        
        $form = $formResult->fetch_assoc();
        $stmt->close();
        
        $tableView = $form['TableView'];
        
        // Get primary key column from data_config (default to 'id' if not found)
        $primaryKeyColumn = 'id'; // Default
        $pkSql = "SELECT field_name 
                  FROM data_config 
                  WHERE table_name = ? 
                  AND field_type = 'primary' 
                  LIMIT 1";
        
        $stmt = $conn->prepare($pkSql);
        if ($stmt) {
            $stmt->bind_param("s", $tableView);
            $stmt->execute();
            $pkResult = $stmt->get_result();
            if ($pkResult->num_rows > 0) {
                $pkRow = $pkResult->fetch_assoc();
                $primaryKeyColumn = $pkRow['field_name'];
            }
            $stmt->close();
        }
        
        // If primary key not found in data_config, try common patterns
        if ($primaryKeyColumn === 'id') {
            // Check if 'id' column exists in the table
            $checkSql = "SHOW COLUMNS FROM `$tableView` LIKE 'id'";
            $checkResult = $conn->query($checkSql);
            if ($checkResult && $checkResult->num_rows === 0) {
                // Try to get the first column as primary key
                $firstColSql = "SHOW COLUMNS FROM `$tableView` LIMIT 1";
                $firstColResult = $conn->query($firstColSql);
                if ($firstColResult && $firstColResult->num_rows > 0) {
                    $firstCol = $firstColResult->fetch_assoc();
                    $primaryKeyColumn = $firstCol['Field'];
                }
            }
        }
        
        // Extract primary key values from rows
        $primaryKeyValues = [];
        foreach ($rowsToDelete as $row) {
            if (isset($row[$primaryKeyColumn])) {
                $primaryKeyValues[] = $row[$primaryKeyColumn];
            }
        }
        
        if (empty($primaryKeyValues)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'No valid primary key values found in rows. Primary key column: ' . $primaryKeyColumn
            ]);
            exit;
        }
        
        // Build DELETE query with prepared statement
        $placeholders = implode(',', array_fill(0, count($primaryKeyValues), '?'));
        $deleteSql = "DELETE FROM `$tableView` WHERE `$primaryKeyColumn` IN ($placeholders)";
        
        $stmt = $conn->prepare($deleteSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare delete query: ' . $conn->error);
        }
        
        // Bind parameters
        $types = str_repeat('s', count($primaryKeyValues)); // Use 's' for string, adjust if needed
        $stmt->bind_param($types, ...$primaryKeyValues);
        
        // Execute delete
        if ($stmt->execute()) {
            $deletedCount = $stmt->affected_rows;
            $stmt->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Rows deleted successfully',
                'deletedCount' => $deletedCount,
                'primaryKeyColumn' => $primaryKeyColumn
            ]);
        } else {
            throw new Exception('Failed to execute delete query: ' . $stmt->error);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    } catch (Error $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
}

// Close connection at the end
if (isset($conn)) {
    $conn->close();
}
?>
