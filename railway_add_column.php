<?php
// Get database credentials from environment
$host = getenv('DB_HOST');
$port = getenv('DB_PORT') ?: '3306';
$database = getenv('DB_NAME');
$username = getenv('DB_USERNAME');
$password = getenv('DB_PASSWORD');

echo "Connecting to: $host:$port/$database\n";

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    echo "Connected successfully!\n\n";

    // Check if user_settings table exists
    echo "Checking for user_settings table...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'user_settings'");
    $hasTable = $stmt->fetch();

    if ($hasTable) {
        echo "✓ user_settings table found\n";

        // Count rows
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM user_settings");
        $result = $stmt->fetch();
        echo "  Rows: {$result['count']}\n\n";

        // Check if column exists
        $stmt = $pdo->query("SHOW COLUMNS FROM user_settings LIKE 'custom_voice_preview_url'");
        $columnExists = $stmt->fetch();

        if ($columnExists) {
            echo "✓ Column 'custom_voice_preview_url' already exists\n";
        } else {
            echo "Adding 'custom_voice_preview_url' column...\n";
            $pdo->exec("ALTER TABLE user_settings ADD COLUMN custom_voice_preview_url VARCHAR(500) NULL");
            echo "✓ Column added successfully!\n";
        }

        // Show all columns
        echo "\nAll columns in user_settings:\n";
        $stmt = $pdo->query("SHOW COLUMNS FROM user_settings");
        $columns = $stmt->fetchAll();
        foreach ($columns as $col) {
            echo "  - {$col['Field']} ({$col['Type']})\n";
        }

    } else {
        echo "✗ user_settings table NOT found in this database\n";
        echo "\nAvailable tables:\n";
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll();
        foreach ($tables as $table) {
            $tableName = array_values($table)[0];
            echo "  - $tableName\n";
        }
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
