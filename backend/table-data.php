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
    case 'getFields':
        handleGetFieldConfig();
        break;
    case 'getLookupData':
        handleGetLookupData($jsonBody);
        break;
    case 'add':
        handleAddTableData($jsonBody);
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid action. Use "get", "delete", "add", "getFields", or "getLookupData"'
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

/**
 * Handle GET request - fetch field configurations for form
 */
function handleGetFieldConfig() {
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
        // Get table name from forms
        $formSql = "SELECT TableView FROM forms WHERE FormName = ? LIMIT 1";
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
        
        // Get field configurations - only field_name, field_label, field_type
        // Hardcoded field names: fullname, displayname, birthday, age, job
        $hardcodedFields = ['fullname', 'displayname', 'birthday', 'age', 'job'];
        $placeholders = implode(',', array_fill(0, count($hardcodedFields), '?'));
        
        $fieldsSql = "SELECT field_name, field_label, field_type 
                      FROM data_config 
                      WHERE table_name = ? AND field_name IN ($placeholders)
                      ORDER BY FIELD(field_name, $placeholders)";
        
        $stmt = $conn->prepare($fieldsSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare fields query: ' . $conn->error);
        }
        
        $params = array_merge([$tableView], $hardcodedFields, $hardcodedFields);
        $types = str_repeat('s', count($params));
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $fieldsResult = $stmt->get_result();
        
        $fields = [];
        while ($row = $fieldsResult->fetch_assoc()) {
            // Only include fields with non-empty labels
            if (!empty($row['field_label']) && trim($row['field_label']) !== '') {
                $fields[] = [
                    'field_name' => $row['field_name'],
                    'field_label' => $row['field_label'],
                    'field_type' => $row['field_type']
                ];
            }
        }
        $stmt->close();
        
        echo json_encode([
            'status' => 'success',
            'fields' => $fields,
            'table_name' => $tableView
        ]);
        
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

/**
 * Handle POST request - fetch lookup data for combobox fields
 */
function handleGetLookupData($jsonBody = null) {
    global $conn;
    
    try {
        // Use provided JSON body or read from input stream
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON: ' . json_last_error_msg());
            }
        } else {
            $data = $jsonBody;
        }
        
        // Support both old lookupSql and new tableName/columnName approach
        $lookupSql = $data['lookupSql'] ?? '';
        $tableName = $data['tableName'] ?? '';
        $columnName = $data['columnName'] ?? 'name';
        
        if (!empty($lookupSql)) {
            // Old approach: execute lookup SQL query
            $result = $conn->query($lookupSql);
            
            if (!$result) {
                throw new Exception('Failed to execute lookup query: ' . $conn->error);
            }
            
            $lookupData = [];
            while ($row = $result->fetch_assoc()) {
                // Get first column value (assuming SELECT name FROM ...)
                $values = array_values($row);
                if (!empty($values)) {
                    $lookupData[] = $values[0];
                }
            }
        } else if (!empty($tableName)) {
            // New approach: get data from table directly
            $sql = "SELECT DISTINCT `$columnName` FROM `$tableName` WHERE `$columnName` IS NOT NULL AND `$columnName` != '' ORDER BY `$columnName`";
            $result = $conn->query($sql);
            
            if (!$result) {
                throw new Exception('Failed to execute lookup query: ' . $conn->error);
            }
            
            $lookupData = [];
            while ($row = $result->fetch_assoc()) {
                $lookupData[] = $row[$columnName];
            }
        } else {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Either lookupSql or tableName parameter is required'
            ]);
            exit;
        }
        
        // Remove duplicates and sort
        $lookupData = array_unique($lookupData);
        sort($lookupData);
        
        echo json_encode([
            'status' => 'success',
            'data' => array_values($lookupData)
        ]);
        
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

/**
 * Handle POST request - add new row to table
 */
function handleAddTableData($jsonBody = null) {
    global $conn;
    
    try {
        // Use provided JSON body or read from input stream
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON: ' . json_last_error_msg());
            }
        } else {
            $data = $jsonBody;
        }
        
        $formName = $data['formName'] ?? '';
        $rowData = $data['rowData'] ?? [];
        
        if (empty($formName)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'FormName is required'
            ]);
            exit;
        }
        
        if (empty($rowData) || !is_array($rowData)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'Row data is required and must be an array'
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
        
        // Get field configurations to determine which fields to insert
        $fieldsSql = "SELECT field_name, field_type 
                      FROM data_config 
                      WHERE table_name = ? 
                      ORDER BY id";
        
        $stmt = $conn->prepare($fieldsSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare fields query: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $tableView);
        $stmt->execute();
        $fieldsResult = $stmt->get_result();
        
        $fieldNames = [];
        $comboboxFields = []; // Store combobox field configurations
        while ($row = $fieldsResult->fetch_assoc()) {
            $fieldNames[] = $row['field_name'];
            // Store combobox fields - lookup table name is the same as field name
            if ($row['field_type'] === 'combobox') {
                $comboboxFields[$row['field_name']] = [
                    'field_name' => $row['field_name'],
                    'lookup_table' => $row['field_name'] // e.g., 'job' field uses 'job' table
                ];
            }
        }
        $stmt->close();
        
        // Build INSERT query
        $columns = [];
        $values = [];
        $params = [];
        $types = '';
        
        // Add 'active' field with default value of 1
        $columns[] = "`active`";
        $values[] = "?";
        $params[] = 1;
        $types .= "i"; // integer type for active
        
        foreach ($fieldNames as $fieldName) {
            // Skip 'active' if it's in the field list (we're setting it to 1 by default)
            if ($fieldName === 'active') {
                continue;
            }
            
            if (isset($rowData[$fieldName])) {
                $columns[] = "`$fieldName`";
                $values[] = "?";
                // Convert empty strings to NULL
                $value = $rowData[$fieldName];
                
                // Handle combobox fields - need to get ID from lookup table
                if (isset($comboboxFields[$fieldName]) && $value !== '' && $value !== null) {
                    $lookupTableName = $comboboxFields[$fieldName]['lookup_table'];
                    $lookupColumnName = 'name'; // Default column name for lookup tables
                    
                    if ($lookupTableName) {
                        // Check if value exists in lookup table
                        $checkSql = "SELECT id FROM `$lookupTableName` WHERE `$lookupColumnName` = ? LIMIT 1";
                        $checkStmt = $conn->prepare($checkSql);
                        if ($checkStmt) {
                            $checkStmt->bind_param("s", $value);
                            $checkStmt->execute();
                            $checkResult = $checkStmt->get_result();
                            
                            if ($checkResult->num_rows > 0) {
                                // Value exists, get the ID
                                $existingRow = $checkResult->fetch_assoc();
                                $value = $existingRow['id'];
                            } else {
                                // Value doesn't exist, insert it and get the new ID
                                $insertLookupSql = "INSERT INTO `$lookupTableName` (`$lookupColumnName`) VALUES (?)";
                                $insertStmt = $conn->prepare($insertLookupSql);
                                if ($insertStmt) {
                                    $insertStmt->bind_param("s", $value);
                                    if ($insertStmt->execute()) {
                                        $value = $conn->insert_id;
                                    } else {
                                        throw new Exception('Failed to insert new lookup value: ' . $insertStmt->error);
                                    }
                                    $insertStmt->close();
                                } else {
                                    throw new Exception('Failed to prepare lookup insert query: ' . $conn->error);
                                }
                            }
                            $checkStmt->close();
                        }
                    }
                }
                
                if ($value === '' || $value === null) {
                    $params[] = null;
                    $types .= "s"; // Use string type but pass NULL
                } else {
                    $params[] = $value;
                    $types .= "s"; // Assume string type for all fields
                }
            }
        }
        
        if (empty($columns)) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'No valid fields to insert'
            ]);
            exit;
        }
        
        $columnsStr = implode(', ', $columns);
        $valuesStr = implode(', ', $values);
        $insertSql = "INSERT INTO `$tableView` ($columnsStr) VALUES ($valuesStr)";
        
        $stmt = $conn->prepare($insertSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare insert query: ' . $conn->error);
        }
        
        // Handle NULL values properly
        // mysqli doesn't support NULL in bind_param directly, so we need to use a workaround
        $refs = [];
        foreach ($params as $key => $value) {
            $refs[$key] = &$params[$key];
        }
        
        // Use call_user_func_array for proper NULL handling
        if (!call_user_func_array([$stmt, 'bind_param'], array_merge([$types], $refs))) {
            throw new Exception('Failed to bind parameters: ' . $stmt->error);
        }
        
        // Execute insert
        if ($stmt->execute()) {
            $insertedId = $conn->insert_id;
            $stmt->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Row added successfully',
                'insertedId' => $insertedId
            ]);
        } else {
            throw new Exception('Failed to execute insert query: ' . $stmt->error);
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

/**
 * Extract table name from lookup SQL query
 * Examples:
 *   "SELECT name FROM job" -> "job"
 *   "SELECT id, name FROM job WHERE active = 1" -> "job"
 */
function extractTableNameFromLookupSql($lookupSql) {
    // Remove comments and normalize whitespace
    $sql = preg_replace('/--.*$/m', '', $lookupSql);
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);
    $sql = preg_replace('/\s+/', ' ', trim($sql));
    
    // Match "FROM table_name" or "FROM `table_name`"
    if (preg_match('/FROM\s+`?(\w+)`?/i', $sql, $matches)) {
        return $matches[1];
    }
    
    return null;
}

/**
 * Extract column name from lookup SQL query
 * Examples:
 *   "SELECT name FROM job" -> "name"
 *   "SELECT id, name FROM job" -> "name" (first column after SELECT)
 */
function extractColumnNameFromLookupSql($lookupSql) {
    // Remove comments and normalize whitespace
    $sql = preg_replace('/--.*$/m', '', $lookupSql);
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);
    $sql = preg_replace('/\s+/', ' ', trim($sql));
    
    // Match "SELECT column_name" or "SELECT `column_name`"
    // Get the last column in SELECT (usually the display column)
    if (preg_match('/SELECT\s+(?:[^,]+,\s*)*`?(\w+)`?/i', $sql, $matches)) {
        return $matches[1];
    }
    
    // Default to 'name' if not found
    return 'name';
}

// Close connection at the end
if (isset($conn)) {
    $conn->close();
}
?>
