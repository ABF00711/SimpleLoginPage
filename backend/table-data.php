<?php

// Suppress any output before JSON
ob_start();

header('Content-Type: application/json');
session_start();
require_once __DIR__ . '/db.php';

// Clear any output buffer before sending JSON
ob_end_clean();

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
    case 'update':
        handleUpdateTableData($jsonBody);
        break;
    case 'getGridState':
        handleGetGridState($jsonBody);
        break;
    case 'saveGridState':
        handleSaveGridState($jsonBody);
        break;
    case 'getPatterns':
        handleGetPatterns($jsonBody);
        break;
    case 'getPattern':
        handleGetPattern($jsonBody);
        break;
    case 'savePattern':
        handleSavePattern($jsonBody);
        break;
    case 'deletePattern':
        handleDeletePattern($jsonBody);
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid action. Use "get", "delete", "add", "update", "getFields", "getLookupData", "getGridState", "saveGridState", "getPatterns", "getPattern", "savePattern", or "deletePattern"'
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
            // Convert invalid dates ("0000-00-00") to NULL for all date fields
            foreach ($columns as $column) {
                if ($column['column_type'] === 'date' && isset($row[$column['column_name']])) {
                    $dateValue = $row[$column['column_name']];
                    // Check if date is invalid (0000-00-00 or starts with 0000-)
                    if ($dateValue === '0000-00-00' || (is_string($dateValue) && strpos($dateValue, '0000-') === 0)) {
                        $row[$column['column_name']] = null;
                    } else if ($dateValue && is_string($dateValue)) {
                        // Validate date format
                        $dateParts = explode('-', $dateValue);
                        if (count($dateParts) === 3) {
                            $year = intval($dateParts[0]);
                            $month = intval($dateParts[1]);
                            $day = intval($dateParts[2]);
                            // If year is 0 or invalid, set to NULL
                            if ($year === 0 || $month === 0 || $day === 0 || $month > 12 || $day > 31) {
                                $row[$column['column_name']] = null;
                            }
                        }
                    }
                }
            }
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
        $id = $data['id'] ?? null; // For edit mode - get specific value by ID
        
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
                
                // Handle invalid dates - convert "0000-00-00" or invalid dates to NULL
                if (isset($comboboxFields[$fieldName])) {
                    // Already handled combobox above
                } else {
                    // Check if this is a date field and validate it
                    $fieldTypeSql = "SELECT field_type FROM data_config WHERE table_name = ? AND field_name = ? LIMIT 1";
                    $fieldTypeStmt = $conn->prepare($fieldTypeSql);
                    if ($fieldTypeStmt) {
                        $fieldTypeStmt->bind_param("ss", $tableView, $fieldName);
                        $fieldTypeStmt->execute();
                        $fieldTypeResult = $fieldTypeStmt->get_result();
                        if ($fieldTypeResult->num_rows > 0) {
                            $fieldTypeRow = $fieldTypeResult->fetch_assoc();
                            if ($fieldTypeRow['field_type'] === 'date' && $value !== '' && $value !== null) {
                                // Validate date - reject "0000-00-00" or invalid dates
                                if ($value === '0000-00-00' || strpos($value, '0000-') === 0) {
                                    $value = null;
                                } else {
                                    // Try to validate the date format
                                    $dateParts = explode('-', $value);
                                    if (count($dateParts) === 3) {
                                        $year = intval($dateParts[0]);
                                        $month = intval($dateParts[1]);
                                        $day = intval($dateParts[2]);
                                        // If year is 0 or invalid, set to NULL
                                        if ($year === 0 || $month === 0 || $day === 0 || $month > 12 || $day > 31) {
                                            $value = null;
                                        }
                                    }
                                }
                            }
                        }
                        $fieldTypeStmt->close();
                    }
                }
                
                // Handle invalid dates - convert "0000-00-00" or invalid dates to NULL
                if (!isset($comboboxFields[$fieldName])) {
                    // Check if this is a date field and validate it
                    $fieldTypeSql = "SELECT field_type FROM data_config WHERE table_name = ? AND field_name = ? LIMIT 1";
                    $fieldTypeStmt = $conn->prepare($fieldTypeSql);
                    if ($fieldTypeStmt) {
                        $fieldTypeStmt->bind_param("ss", $tableView, $fieldName);
                        $fieldTypeStmt->execute();
                        $fieldTypeResult = $fieldTypeStmt->get_result();
                        if ($fieldTypeResult->num_rows > 0) {
                            $fieldTypeRow = $fieldTypeResult->fetch_assoc();
                            if ($fieldTypeRow['field_type'] === 'date' && $value !== '' && $value !== null) {
                                // Validate date - reject "0000-00-00" or invalid dates
                                if ($value === '0000-00-00' || strpos($value, '0000-') === 0) {
                                    $value = null;
                                } else {
                                    // Try to validate the date format
                                    $dateParts = explode('-', $value);
                                    if (count($dateParts) === 3) {
                                        $year = intval($dateParts[0]);
                                        $month = intval($dateParts[1]);
                                        $day = intval($dateParts[2]);
                                        // If year is 0 or invalid, set to NULL
                                        if ($year === 0 || $month === 0 || $day === 0 || $month > 12 || $day > 31) {
                                            $value = null;
                                        }
                                    }
                                }
                            }
                        }
                        $fieldTypeStmt->close();
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
 * Handle UPDATE request - update table data
 */
function handleUpdateTableData($jsonBody = null) {
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
        
        $formName = $data['formName'] ?? null;
        $rowData = $data['rowData'] ?? [];
        $originalRowData = $data['originalRowData'] ?? [];
        
        if (!$formName) {
            throw new Exception('FormName parameter is required');
        }
        
        if (empty($rowData)) {
            throw new Exception('RowData parameter is required');
        }
        
        // Get form definition to find table view
        $formSql = "SELECT TableView FROM forms WHERE FormName = ? LIMIT 1";
        $stmt = $conn->prepare($formSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare form query: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $formName);
        $stmt->execute();
        $formResult = $stmt->get_result();
        
        if ($formResult->num_rows === 0) {
            $stmt->close();
            throw new Exception('Form not found: ' . $formName);
        }
        
        $form = $formResult->fetch_assoc();
        $stmt->close();
        
        $tableView = $form['TableView'];
        
        // Get field configurations to determine which fields to update
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
        
        // Find primary key column (for WHERE clause)
        $primaryKeySql = "SELECT field_name FROM data_config WHERE table_name = ? AND field_type = 'primary' LIMIT 1";
        $stmt = $conn->prepare($primaryKeySql);
        if (!$stmt) {
            throw new Exception('Failed to prepare primary key query: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $tableView);
        $stmt->execute();
        $pkResult = $stmt->get_result();
        $primaryKey = 'id'; // Default
        if ($pkResult->num_rows > 0) {
            $pkRow = $pkResult->fetch_assoc();
            $primaryKey = $pkRow['field_name'];
        }
        $stmt->close();
        
        // Get primary key value from original row data
        $primaryKeyValue = $originalRowData[$primaryKey] ?? null;
        if (!$primaryKeyValue) {
            throw new Exception('Primary key value not found in original row data');
        }
        
        // Build UPDATE query
        $setClauses = [];
        $params = [];
        $types = '';
        
        foreach ($fieldNames as $fieldName) {
            // Skip primary key and active field (don't update active in edit)
            if ($fieldName === $primaryKey || $fieldName === 'active') {
                continue;
            }
            
            if (isset($rowData[$fieldName])) {
                $setClauses[] = "`$fieldName` = ?";
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
        
        if (empty($setClauses)) {
            throw new Exception('No fields to update');
        }
        
        // Add primary key value to params for WHERE clause
        $params[] = $primaryKeyValue;
        $types .= "s"; // Primary key type (assuming string, adjust if needed)
        
        $setClausesStr = implode(', ', $setClauses);
        $updateSql = "UPDATE `$tableView` SET $setClausesStr WHERE `$primaryKey` = ?";
        
        $stmt = $conn->prepare($updateSql);
        if (!$stmt) {
            throw new Exception('Failed to prepare update query: ' . $conn->error);
        }
        
        // Handle NULL values properly
        $refs = [];
        foreach ($params as $key => $value) {
            $refs[$key] = &$params[$key];
        }
        
        // Use call_user_func_array for proper NULL handling
        if (!call_user_func_array([$stmt, 'bind_param'], array_merge([$types], $refs))) {
            throw new Exception('Failed to bind parameters: ' . $stmt->error);
        }
        
        // Execute update
        if ($stmt->execute()) {
            $affectedRows = $stmt->affected_rows;
            $stmt->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Row updated successfully',
                'affectedRows' => $affectedRows
            ]);
        } else {
            throw new Exception('Failed to execute update query: ' . $stmt->error);
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

/**
 * Handle GET request for grid_state (auto-load)
 */
function handleGetGridState($jsonBody = null) {
    global $conn;
    
    try {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $userId = $_SESSION['user_id'] ?? null;
        
        if (!$userId) {
            throw new Exception('User not authenticated');
        }
        
        if ($jsonBody === null) {
            // Try GET parameters first, then POST body
            $tableName = $_GET['tableName'] ?? $_POST['tableName'] ?? null;
            if (!$tableName) {
                $jsonInput = file_get_contents('php://input');
                $data = json_decode($jsonInput, true);
                $tableName = $data['tableName'] ?? null;
            }
        } else {
            $tableName = $jsonBody['tableName'] ?? null;
        }
        
        if (!$tableName) {
            throw new Exception('tableName is required');
        }
        
        // Get the current grid_state for this user and table
        $sql = "SELECT state FROM grid_state WHERE userId = ? AND formname = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare query: ' . $conn->error);
        }
        
        $stmt->bind_param("is", $userId, $tableName);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $stmt->close();
            // Return empty state if not found
            echo json_encode([
                'status' => 'success',
                'data' => null
            ]);
            return;
        }
        
        $row = $result->fetch_assoc();
        $stmt->close();
        
        // Parse the JSON data
        $gridState = json_decode($row['state'], true);
        
        echo json_encode([
            'status' => 'success',
            'data' => $gridState
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
 * Handle SAVE request for grid_state (auto-save with debouncing)
 */
function handleSaveGridState($jsonBody = null) {
    global $conn;
    
    try {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $userId = $_SESSION['user_id'] ?? null;
        
        if (!$userId) {
            throw new Exception('User not authenticated');
        }
        
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
        } else {
            $data = $jsonBody;
        }
        
        $tableName = $data['tableName'] ?? '';
        $gridStateData = $data['data'] ?? null;
        
        if (!$tableName || $gridStateData === null) {
            throw new Exception('tableName and data are required');
        }
        
        // Convert data to JSON string
        $jsonData = json_encode($gridStateData);
        
        // Check if grid_state exists for this user and table
        $checkSql = "SELECT id FROM grid_state WHERE userId = ? AND formname = ? LIMIT 1";
        $checkStmt = $conn->prepare($checkSql);
        if (!$checkStmt) {
            throw new Exception('Failed to prepare check query: ' . $conn->error);
        }
        $checkStmt->bind_param("is", $userId, $tableName);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $exists = $checkResult->num_rows > 0;
        $checkStmt->close();
        
        if ($exists) {
            // Update existing grid_state
            $sql = "UPDATE grid_state SET state = ? WHERE userId = ? AND formname = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare update query: ' . $conn->error);
            }
            $stmt->bind_param("sis", $jsonData, $userId, $tableName);
        } else {
            // Insert new grid_state
            $sql = "INSERT INTO grid_state (formname, userId, state) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare insert query: ' . $conn->error);
            }
            $stmt->bind_param("sis", $tableName, $userId, $jsonData);
        }
        
        if ($stmt->execute()) {
            $stmt->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Grid state saved successfully'
            ]);
        } else {
            throw new Exception('Failed to execute query: ' . $stmt->error);
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
 * Handle GET request for patterns list
 */
function handleGetPatterns($jsonBody = null) {
    global $conn;
    
    try {
        $userId = $_SESSION['user_id'] ?? null;
        
        if (!$userId) {
            throw new Exception('User not authenticated');
        }
        
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
        } else {
            $data = $jsonBody;
        }
        
        $type = $data['type'] ?? ''; // 'searchpattern' or 'layout'
        $formTableName = $data['tableName'] ?? '';
        
        if (!$type || !$formTableName) {
            throw new Exception('Type and tableName are required');
        }
        
        $dbTableName = $type === 'searchpattern' ? 'grid_searchpatterns' : 'grid_layouts';
        
        $sql = "SELECT id, name, data, created_at FROM `$dbTableName` WHERE user_id = ? AND table_name = ? ORDER BY created_at DESC";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare query: ' . $conn->error);
        }
        
        $stmt->bind_param("ss", $userId, $formTableName);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $patterns = [];
        while ($row = $result->fetch_assoc()) {
            $patterns[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'data' => $row['data'],
                'created_at' => $row['created_at']
            ];
        }
        $stmt->close();
        
        echo json_encode([
            'status' => 'success',
            'data' => $patterns
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
 * Handle GET request for single pattern
 */
function handleGetPattern($jsonBody = null) {
    global $conn;
    
    try {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $userId = $_SESSION['user_id'] ?? null;
        
        if (!$userId) {
            throw new Exception('User not authenticated');
        }
        
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
        } else {
            $data = $jsonBody;
        }
        
        $type = $data['type'] ?? '';
        $id = $data['id'] ?? null;
        
        if (!$type || !$id) {
            throw new Exception('Type and id are required');
        }
        
        $dbTableName = $type === 'searchpattern' ? 'grid_searchpatterns' : 'grid_layouts';
        
        $sql = "SELECT id, name, data FROM `$dbTableName` WHERE id = ? AND user_id = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare query: ' . $conn->error);
        }
        
        $stmt->bind_param("is", $id, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $stmt->close();
            throw new Exception('Pattern not found');
        }
        
        $row = $result->fetch_assoc();
        $stmt->close();
        
        echo json_encode([
            'status' => 'success',
            'data' => $row
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
 * Handle SAVE request for pattern
 */
function handleSavePattern($jsonBody = null) {
    global $conn;
    
    try {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $userId = $_SESSION['user_id'] ?? null;
        
        if (!$userId) {
            throw new Exception('User not authenticated');
        }
        
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
        } else {
            $data = $jsonBody;
        }
        
        $type = $data['type'] ?? '';
        $formTableName = $data['tableName'] ?? '';
        $name = $data['name'] ?? '';
        $patternData = $data['data'] ?? '';
        $id = $data['id'] ?? null;
        
        if (!$type || !$formTableName || !$name || !$patternData) {
            throw new Exception('Type, tableName, name, and data are required');
        }
        
        $dbTableName = $type === 'searchpattern' ? 'grid_searchpatterns' : 'grid_layouts';
        
        if ($id) {
            // Update existing pattern
            $sql = "UPDATE `$dbTableName` SET name = ?, data = ? WHERE id = ? AND user_id = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare update query: ' . $conn->error);
            }
            $stmt->bind_param("ssis", $name, $patternData, $id, $userId);
        } else {
            // Insert new pattern
            $sql = "INSERT INTO `$dbTableName` (table_name, user_id, name, data) VALUES (?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare insert query: ' . $conn->error);
            }
            $stmt->bind_param("ssss", $formTableName, $userId, $name, $patternData);
        }
        
        if ($stmt->execute()) {
            $insertedId = $id ? $id : $conn->insert_id;
            $stmt->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => $id ? 'Pattern updated successfully' : 'Pattern saved successfully',
                'id' => $insertedId
            ]);
        } else {
            throw new Exception('Failed to execute query: ' . $stmt->error);
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
 * Handle DELETE request for pattern
 */
function handleDeletePattern($jsonBody = null) {
    global $conn;
    
    try {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $userId = $_SESSION['user_id'] ?? null;
        
        if (!$userId) {
            throw new Exception('User not authenticated');
        }
        
        if ($jsonBody === null) {
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
        } else {
            $data = $jsonBody;
        }
        
        $type = $data['type'] ?? '';
        $id = $data['id'] ?? null;
        
        if (!$type || !$id) {
            throw new Exception('Type and id are required');
        }
        
        $dbTableName = $type === 'searchpattern' ? 'grid_searchpatterns' : 'grid_layouts';
        
        $sql = "DELETE FROM `$dbTableName` WHERE id = ? AND user_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception('Failed to prepare delete query: ' . $conn->error);
        }
        
        $stmt->bind_param("is", $id, $userId);
        
        if ($stmt->execute()) {
            $affectedRows = $stmt->affected_rows;
            $stmt->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Pattern deleted successfully',
                'affectedRows' => $affectedRows
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
