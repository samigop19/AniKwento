<?php
/**
 * Create Custom Voices Table Migration
 *
 * Creates a new table to store multiple custom voices per user
 * This resolves the issue where only one custom voice could be saved at a time
 */

// Railway database credentials
$host = 'gondola.proxy.rlwy.net';
$port = '20168';
$dbname = 'railway';
$username = 'root';
$password = 'LHydrzwgjYkIdNEcYeGNMLtVOFWbSIhG';

echo "Connecting to Railway database...\n";
echo "Host: $host:$port\n";
echo "Database: $dbname\n\n";

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

    echo "✓ Connected to Railway database successfully!\n\n";

    // Create custom_voices table
    echo "Creating custom_voices table...\n";

    $sql = "
        CREATE TABLE IF NOT EXISTS `custom_voices` (
          `id` int NOT NULL AUTO_INCREMENT,
          `user_id` int NOT NULL,
          `voice_key` varchar(100) NOT NULL COMMENT 'Unique key like custom_1234567890',
          `voice_name` varchar(100) NOT NULL COMMENT 'Display name for the voice',
          `voice_id` varchar(255) NOT NULL COMMENT 'ElevenLabs Voice ID',
          `avatar_url` text COMMENT 'ReadyPlayerMe avatar URL with lip sync support',
          `preview_url` text COMMENT 'R2 public URL for voice preview audio',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `unique_user_voice_key` (`user_id`, `voice_key`),
          KEY `idx_user_id` (`user_id`),
          KEY `idx_voice_key` (`voice_key`),
          CONSTRAINT `custom_voices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom voices created by users'
    ";

    $pdo->exec($sql);
    echo "✓ Created custom_voices table successfully!\n\n";

    // Migrate existing custom voice from user_settings if any
    echo "Migrating existing custom voices from user_settings...\n";

    $migrateSQL = "
        INSERT INTO custom_voices (user_id, voice_key, voice_name, voice_id, avatar_url, preview_url)
        SELECT
            user_id,
            CASE
                WHEN voice_mode LIKE 'custom_%' THEN voice_mode
                ELSE CONCAT('custom_', UNIX_TIMESTAMP(NOW()))
            END as voice_key,
            custom_voice_name,
            custom_voice_id,
            custom_avatar_url,
            custom_voice_preview_url
        FROM user_settings
        WHERE custom_voice_id IS NOT NULL
          AND custom_voice_id != ''
          AND custom_voice_name IS NOT NULL
          AND custom_voice_name != ''
        ON DUPLICATE KEY UPDATE
            voice_name = VALUES(voice_name),
            voice_id = VALUES(voice_id),
            avatar_url = VALUES(avatar_url),
            preview_url = VALUES(preview_url)
    ";

    $stmt = $pdo->query($migrateSQL);
    $migratedCount = $stmt->rowCount();
    echo "✓ Migrated $migratedCount custom voice(s) from user_settings\n\n";

    // Verify the table
    echo "Verifying custom_voices table structure:\n";
    $describeStmt = $pdo->query("DESCRIBE custom_voices");
    $columns = $describeStmt->fetchAll();

    foreach ($columns as $column) {
        echo "  - {$column['Field']} ({$column['Type']})\n";
    }

    echo "\n";

    // Show migrated data
    echo "Checking migrated custom voices:\n";
    $countStmt = $pdo->query("SELECT COUNT(*) as count FROM custom_voices");
    $count = $countStmt->fetch()['count'];
    echo "  Total custom voices: $count\n";

    if ($count > 0) {
        echo "\nCustom voices in database:\n";
        $voicesStmt = $pdo->query("SELECT id, user_id, voice_key, voice_name, voice_id FROM custom_voices ORDER BY created_at DESC");
        $voices = $voicesStmt->fetchAll();

        foreach ($voices as $voice) {
            echo "  - ID: {$voice['id']}, User: {$voice['user_id']}, Key: {$voice['voice_key']}, Name: {$voice['voice_name']}\n";
        }
    }

    echo "\n========================================\n";
    echo "✓ Migration completed successfully!\n";
    echo "========================================\n";

} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
