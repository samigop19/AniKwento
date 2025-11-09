<?php
/**
 * Migration script to add custom_voice_preview_url column to user_settings table
 * Run this once on Railway to add the column
 */

require_once __DIR__ . '/source/config/env.php';

try {
    echo "Connecting to database...\n";

    $pdo = new PDO(
        "mysql:host=" . EnvLoader::get('DB_HOST', 'localhost') . ";dbname=" . EnvLoader::get('DB_NAME', 'railway') . ";charset=utf8mb4",
        EnvLoader::get('DB_USERNAME', 'root'),
        EnvLoader::get('DB_PASSWORD', ''),
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        )
    );

    echo "Connected successfully!\n";
    echo "Database: " . EnvLoader::get('DB_NAME', 'railway') . "\n";
    echo "Host: " . EnvLoader::get('DB_HOST', 'localhost') . "\n\n";

    // Check if column exists
    echo "Checking if custom_voice_preview_url column exists...\n";
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as col_exists
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE table_schema = DATABASE()
        AND table_name = 'user_settings'
        AND column_name = 'custom_voice_preview_url'
    ");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result['col_exists'] > 0) {
        echo "✓ Column 'custom_voice_preview_url' already exists in user_settings table.\n";
        echo "No migration needed.\n";
    } else {
        echo "✗ Column 'custom_voice_preview_url' does not exist.\n";
        echo "Adding custom_voice_preview_url column to user_settings table...\n";

        $pdo->exec("
            ALTER TABLE user_settings
            ADD COLUMN custom_voice_preview_url VARCHAR(500) NULL
            AFTER voice_provider
        ");

        echo "✓ Successfully added custom_voice_preview_url column!\n";
    }

    // Verify the table structure
    echo "\nCurrent user_settings table structure:\n";
    echo "----------------------------------------\n";
    $stmt = $pdo->query("DESCRIBE user_settings");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($columns as $column) {
        echo sprintf(
            "%-30s %-20s %-10s %-10s\n",
            $column['Field'],
            $column['Type'],
            $column['Null'],
            $column['Key']
        );
    }

    // Show row count
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM user_settings");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\nTotal rows in user_settings: {$count['count']}\n";

    echo "\nMigration completed successfully!\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
