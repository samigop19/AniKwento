<?php
/**
 * Web-accessible migration script for teacher_profiles table
 * Access via: https://your-domain.com/run_teacher_migration.php
 *
 * SECURITY: Delete this file after running the migration!
 */

// Set execution time and output settings
set_time_limit(120);
ini_set('display_errors', '1');
error_reporting(E_ALL);

// Output as plain text
header('Content-Type: text/plain; charset=utf-8');

echo "Teacher Profiles Table Migration\n";
echo "=================================\n\n";

require_once __DIR__ . '/source/config/env.php';

try {
    echo "[1/5] Connecting to database...\n";

    $pdo = new PDO(
        "mysql:host=" . EnvLoader::get('DB_HOST', 'localhost') . ";dbname=" . EnvLoader::get('DB_NAME', 'railway') . ";charset=utf8mb4",
        EnvLoader::get('DB_USERNAME', 'root'),
        EnvLoader::get('DB_PASSWORD', ''),
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        )
    );

    echo "   ✓ Connected successfully!\n";
    echo "   Database: " . EnvLoader::get('DB_NAME', 'railway') . "\n";
    echo "   Host: " . EnvLoader::get('DB_HOST', 'localhost') . "\n\n";

    // Check current table structure
    echo "[2/5] Checking current table structure...\n";
    $stmt = $pdo->query("DESCRIBE teacher_profiles");
    $existingColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_column($existingColumns, 'Field');

    echo "   Current columns: " . implode(', ', $columnNames) . "\n\n";

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

    echo "[3/5] Checking for missing columns...\n";
    $missingColumns = [];
    foreach ($requiredColumns as $columnName => $columnDef) {
        if (!in_array($columnName, $columnNames)) {
            $missingColumns[] = $columnName;
        }
    }

    if (empty($missingColumns)) {
        echo "   ✓ All required columns already exist!\n";
        echo "   No migration needed.\n\n";
    } else {
        echo "   Found " . count($missingColumns) . " missing column(s): " . implode(', ', $missingColumns) . "\n\n";

        echo "[4/5] Adding missing columns...\n";
        $columnsAdded = 0;
        foreach ($requiredColumns as $columnName => $columnDef) {
            if (!in_array($columnName, $columnNames)) {
                echo "   Adding $columnName... ";
                $pdo->exec("ALTER TABLE teacher_profiles ADD COLUMN $columnName $columnDef");
                $columnsAdded++;
                echo "✓\n";
            }
        }
        echo "   Successfully added $columnsAdded column(s)!\n\n";
    }

    // Verify final structure
    echo "[5/5] Verifying final table structure...\n";
    $stmt = $pdo->query("DESCRIBE teacher_profiles");
    $finalColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "   Final column count: " . count($finalColumns) . "\n";
    echo "   All columns: " . implode(', ', array_column($finalColumns, 'Field')) . "\n\n";

    echo "=================================\n";
    echo "✓ Migration completed successfully!\n\n";
    echo "IMPORTANT: Delete this file (run_teacher_migration.php) now for security!\n";

} catch (PDOException $e) {
    echo "\n✗ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    http_response_code(500);
    exit(1);
}
