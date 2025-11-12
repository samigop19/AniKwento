<?php
/**
 * Database Setup Script for User Settings
 * Run this script to create the user_settings table if it doesn't exist
 */

require_once '../source/handlers/db_connection.php';

echo "Setting up user_settings table...\n\n";

// Read the SQL migration file
$sqlFile = __DIR__ . '/migrations/user_settings.sql';

if (!file_exists($sqlFile)) {
    die("Error: Migration file not found at $sqlFile\n");
}

$sql = file_get_contents($sqlFile);

// Split by semicolons to get individual statements
$statements = array_filter(
    array_map('trim', explode(';', $sql)),
    function($stmt) {
        return !empty($stmt) &&
               stripos($stmt, 'START TRANSACTION') === false &&
               stripos($stmt, 'COMMIT') === false &&
               stripos($stmt, 'SET ') === false;
    }
);

$success = true;

foreach ($statements as $statement) {
    if (empty($statement)) continue;

    echo "Executing: " . substr($statement, 0, 50) . "...\n";

    if (!$conn->query($statement)) {
        // Ignore "table already exists" errors
        if ($conn->errno != 1050) {
            echo "Error: " . $conn->error . "\n";
            $success = false;
        } else {
            echo "Table already exists (skipped)\n";
        }
    } else {
        echo "Success!\n";
    }
}

// Verify the table was created
$result = $conn->query("SHOW TABLES LIKE 'user_settings'");
if ($result && $result->num_rows > 0) {
    echo "\n✓ user_settings table is ready!\n";

    // Show table structure
    $structure = $conn->query("DESCRIBE user_settings");
    echo "\nTable structure:\n";
    echo str_repeat("-", 80) . "\n";
    printf("%-25s %-15s %-10s %-10s\n", "Field", "Type", "Null", "Default");
    echo str_repeat("-", 80) . "\n";

    while ($row = $structure->fetch_assoc()) {
        printf("%-25s %-15s %-10s %-10s\n",
            $row['Field'],
            $row['Type'],
            $row['Null'],
            $row['Default'] ?? 'NULL'
        );
    }
    echo str_repeat("-", 80) . "\n";
} else {
    echo "\n✗ Failed to create user_settings table\n";
    $success = false;
}

$conn->close();

if ($success) {
    echo "\nDatabase setup completed successfully!\n";
    exit(0);
} else {
    echo "\nDatabase setup encountered errors.\n";
    exit(1);
}
