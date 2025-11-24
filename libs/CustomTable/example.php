<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Table Module - PHP Example</title>
    <link rel="stylesheet" href="table-module.css">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #f5f7fa;
        }
        h1 {
            color: #2c3e50;
            margin-bottom: 2rem;
        }
        .example-section {
            background: white;
            padding: 2rem;
            margin-bottom: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body>
    <h1>Table Module - PHP Integration Example</h1>

    <div class="example-section">
        <h2>Users Table (from PHP/MySQL)</h2>
        <div id="users-table"></div>
    </div>

    <script src="table-module.js"></script>
    <script>
        // Example: Data from PHP/MySQL
        // In a real scenario, you would fetch this via AJAX or embed it in the page
        
        <?php
        // Example PHP data (simulating database results)
        // In production, you would fetch from MySQL:
        /*
        $conn = new mysqli("localhost", "username", "password", "database");
        $result = $conn->query("SELECT * FROM users");
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        */
        
        // Simulated data for demonstration
        $users = [
            ['id' => 1, 'username' => 'admin', 'email' => 'admin@example.com', 'role' => 'Administrator', 'created_at' => '2024-01-15'],
            ['id' => 2, 'username' => 'john_doe', 'email' => 'john@example.com', 'role' => 'User', 'created_at' => '2024-02-20'],
            ['id' => 3, 'username' => 'jane_smith', 'email' => 'jane@example.com', 'role' => 'Moderator', 'created_at' => '2024-03-10'],
            ['id' => 4, 'username' => 'bob_wilson', 'email' => 'bob@example.com', 'role' => 'User', 'created_at' => '2024-03-15'],
            ['id' => 5, 'username' => 'alice_brown', 'email' => 'alice@example.com', 'role' => 'User', 'created_at' => '2024-04-01'],
            ['id' => 6, 'username' => 'charlie_davis', 'email' => 'charlie@example.com', 'role' => 'User', 'created_at' => '2024-04-05'],
            ['id' => 7, 'username' => 'diana_miller', 'email' => 'diana@example.com', 'role' => 'Moderator', 'created_at' => '2024-04-10'],
            ['id' => 8, 'username' => 'eve_taylor', 'email' => 'eve@example.com', 'role' => 'User', 'created_at' => '2024-04-12'],
        ];
        
        // Convert PHP array to JSON
        $usersJson = json_encode($users);
        ?>

        // Initialize table with PHP data
        const usersData = <?php echo $usersJson; ?>;
        
        const usersTable = new TableModule('users-table', {
            data: usersData,
            columns: [
                { key: 'id', header: 'ID' },
                { key: 'username', header: 'Username' },
                { key: 'email', header: 'Email' },
                { 
                    key: 'role', 
                    header: 'Role',
                    format: (value) => {
                        const colors = {
                            'Administrator': '#e74c3c',
                            'Moderator': '#f39c12',
                            'User': '#3498db'
                        };
                        const color = colors[value] || '#95a5a6';
                        return `<span style="color: ${color}; font-weight: 600;">${value}</span>`;
                    }
                },
                { key: 'created_at', header: 'Created At' }
            ],
            itemsPerPage: 5
        });
    </script>

    <!-- Alternative: Using AJAX to fetch data -->
    <div class="example-section">
        <h2>Dynamic Data Loading (AJAX Example)</h2>
        <div id="ajax-table"></div>
    </div>

    <script>
        // Example: Load data via AJAX
        // Uncomment and create api.php endpoint to use this:
        /*
        fetch('api.php?action=getUsers')
            .then(response => response.json())
            .then(data => {
                const ajaxTable = new TableModule('ajax-table', {
                    data: data,
                    columns: [
                        { key: 'id', header: 'ID' },
                        { key: 'username', header: 'Username' },
                        { key: 'email', header: 'Email' },
                        { key: 'role', header: 'Role' }
                    ]
                });
            })
            .catch(error => console.error('Error:', error));
        */
    </script>
</body>
</html>

