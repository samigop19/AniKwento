<?php
/**
 * Verify Railway Database Schema
 */

// Use Railway database connection
$host = getenv('MYSQL_HOST') ?: getenv('DB_HOST');
$port = getenv('MYSQL_PORT') ?: '3306';
$dbname = getenv('MYSQL_DATABASE') ?: getenv('DB_NAME');
$username = getenv('MYSQL_USER') ?: getenv('DB_USERNAME');
$password = getenv('MYSQL_PASSWORD') ?: getenv('DB_PASSWORD');

header('Content-Type: text/plain; charset=utf-8');

echo "===========================================\n";
echo "Railway Database Schema Verification\n";
echo "===========================================\n\n";

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    echo "✓ Connected to Railway database\n";
    echo "Host: $host:$port\n";
    echo "Database: $dbname\n\n";

    // Get all tables
    echo "Tables in database:\n";
    echo "==================\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tables as $table) {
        echo "  ✓ $table\n";

        // Get column count
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '$dbname' AND TABLE_NAME = '$table'");
        $colCount = $stmt->fetch()['count'];
        echo "     ($colCount columns)\n";
    }

    echo "\n===========================================\n";
    echo "Checking specific tables:\n";
    echo "===========================================\n\n";

    $expectedTables = [
        'stories',
        'story_scenes',
        'story_scene_audio',
        'story_gamification',
        'teacher_profiles',
        'user_settings'
    ];

    foreach ($expectedTables as $expectedTable) {
        if (in_array($expectedTable, $tables)) {
            echo "✓ $expectedTable - EXISTS\n";

            // Show a few columns
            $stmt = $pdo->query("SHOW COLUMNS FROM `$expectedTable`");
            $columns = $stmt->fetchAll();
            echo "  Columns:\n";
            foreach (array_slice($columns, 0, 5) as $col) {
                echo "    - {$col['Field']} ({$col['Type']})\n";
            }
            if (count($columns) > 5) {
                echo "    ... and " . (count($columns) - 5) . " more\n";
            }
            echo "\n";
        } else {
            echo "✗ $expectedTable - MISSING\n";
        }
    }

    // Check if teacher_profile (without s) exists
    if (in_array('teacher_profile', $tables)) {
        echo "⚠️  WARNING: 'teacher_profile' (singular) still exists - should be deleted!\n";
    } else {
        echo "✓ Confirmed: 'teacher_profile' (singular, incorrect) does not exist\n";
    }

} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
