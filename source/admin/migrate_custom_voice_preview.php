<?php



header('Content-Type: text/plain; charset=utf-8');


$allowedIPs = ['127.0.0.1', '::1'];
$isRailway = isset($_ENV['RAILWAY_ENVIRONMENT']) || getenv('RAILWAY_ENVIRONMENT');

if (!$isRailway && !in_array($_SERVER['REMOTE_ADDR'] ?? '', $allowedIPs)) {
    http_response_code(403);
    die("Access denied. This migration can only be run on Railway or localhost.\n");
}

require_once __DIR__ . '/../config/env.php';

try {
    echo "=== Custom Voice Preview URL Column Migration ===\n\n";
    echo "Connecting to database...\n";
    echo "Database: " . EnvLoader::get('DB_NAME', 'railway') . "\n";
    echo "Host: " . EnvLoader::get('DB_HOST', 'localhost') . "\n\n";

    $pdo = new PDO(
        "mysql:host=" . EnvLoader::get('DB_HOST', 'localhost') . ";dbname=" . EnvLoader::get('DB_NAME', 'railway') . ";charset=utf8mb4",
        EnvLoader::get('DB_USERNAME', 'root'),
        EnvLoader::get('DB_PASSWORD', ''),
        array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        )
    );

    echo "✓ Connected successfully!\n\n";

    
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

    
    echo "\n=== Current user_settings table structure ===\n";
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

    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM user_settings");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\n✓ Total rows in user_settings: {$count['count']}\n";

    
    if ($count['count'] > 0) {
        echo "\n=== Sample data (first 3 rows) ===\n";
        $stmt = $pdo->query("SELECT user_id, voice_mode, custom_voice_id, custom_voice_preview_url FROM user_settings LIMIT 3");
        $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($samples as $sample) {
            echo "User ID: {$sample['user_id']}, Voice Mode: " . ($sample['voice_mode'] ?? 'NULL') . ", Preview URL: " . ($sample['custom_voice_preview_url'] ?? 'NULL') . "\n";
        }
    }

    echo "\n=== Migration completed successfully! ===\n";

} catch (PDOException $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
