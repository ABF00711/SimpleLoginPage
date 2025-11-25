<?php

header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

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

if (isset($conn)) {
    $conn->close();
}
?>

