<?php
/**
 * Migration script to update teacher_profiles table structure
 * Adds missing columns: full_name, position, degree, institution, etc.
 * Run this on Railway to fix the profile save issue
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

    // Check current table structure
    echo "Current teacher_profiles table structure:\n";
    echo "==========================================\n";
    $stmt = $pdo->query("DESCRIBE teacher_profiles");
    $existingColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $columnNames = array_column($existingColumns, 'Field');

    foreach ($existingColumns as $column) {
        echo sprintf(
            "%-20s %-20s %-10s\n",
            $column['Field'],
            $column['Type'],
            $column['Null']
        );
    }
    echo "\n";

    // Define required columns
    $requiredColumns = [
        'full_name' => "VARCHAR(255) DEFAULT NULL",
        'position' => "VARCHAR(255) DEFAULT NULL",
        'degree' => "VARCHAR(255) DEFAULT NULL",
        'institution' => "VARCHAR(255) DEFAULT NULL",
        'year_graduated' => "INT DEFAULT NULL",
        'experience_years' => "INT DEFAULT NULL",
        'experience_desc' => "TEXT DEFAULT NULL",
        'email' => "VARCHAR(255) DEFAULT NULL",
        'certifications' => "TEXT DEFAULT NULL",
        'skills' => "TEXT DEFAULT NULL",
        'photo' => "VARCHAR(255) DEFAULT NULL",
        'share_token' => "VARCHAR(64) DEFAULT NULL"
    ];

    // Add missing columns
    $columnsAdded = 0;
    foreach ($requiredColumns as $columnName => $columnDef) {
        if (!in_array($columnName, $columnNames)) {
            echo "Adding column: $columnName...\n";
            $pdo->exec("ALTER TABLE teacher_profiles ADD COLUMN $columnName $columnDef");
            $columnsAdded++;
            echo "✓ Added $columnName\n";
        } else {
            echo "✓ Column $columnName already exists\n";
        }
    }

    echo "\n";
    if ($columnsAdded > 0) {
        echo "Successfully added $columnsAdded column(s)!\n";
    } else {
        echo "All columns already exist. No migration needed.\n";
    }

    // Show final table structure
    echo "\nFinal teacher_profiles table structure:\n";
    echo "========================================\n";
    $stmt = $pdo->query("DESCRIBE teacher_profiles");
    $finalColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($finalColumns as $column) {
        echo sprintf(
            "%-20s %-20s %-10s\n",
            $column['Field'],
            $column['Type'],
            $column['Null']
        );
    }

    echo "\nMigration completed successfully!\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
