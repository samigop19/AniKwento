<?php
/**
 * Railway Database Schema Sync Script
 *
 * This script will:
 * 1. Drop the incorrectly named 'teacher_profile' table
 * 2. Recreate all tables with correct schema from local database
 *
 * Tables to sync:
 * - stories
 * - story_gamification
 * - story_scene_audio
 * - story_scenes
 * - teacher_profiles (correct plural name)
 * - user_settings
 */

// Use Railway database connection
// Try both MYSQL_ and DB_ prefixes for compatibility
$host = getenv('MYSQL_HOST') ?: getenv('DB_HOST');
$port = getenv('MYSQL_PORT') ?: '3306';
$dbname = getenv('MYSQL_DATABASE') ?: getenv('DB_NAME');
$username = getenv('MYSQL_USER') ?: getenv('DB_USERNAME');
$password = getenv('MYSQL_PASSWORD') ?: getenv('DB_PASSWORD');

if (!$host || !$dbname || !$username) {
    die("Error: Railway database environment variables not set.\n" .
        "Expected: DB_HOST, DB_NAME, DB_USERNAME, DB_PASSWORD\n");
}

echo "Connecting to Railway database...\n";
echo "Host: $host:$port\n";
echo "Database: $dbname\n";

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

    // Start transaction
    $pdo->beginTransaction();

    // 1. Drop the incorrectly named teacher_profile table
    echo "Step 1: Dropping incorrect 'teacher_profile' table...\n";
    $pdo->exec("DROP TABLE IF EXISTS `teacher_profile`");
    echo "✓ Dropped teacher_profile table\n\n";

    // 2. Drop existing tables in correct order (respecting foreign keys)
    echo "Step 2: Dropping existing tables (if they exist)...\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    $tablesToDrop = [
        'story_gamification',
        'story_scene_audio',
        'story_scenes',
        'stories',
        'teacher_profiles',
        'user_settings'
    ];

    foreach ($tablesToDrop as $table) {
        $pdo->exec("DROP TABLE IF EXISTS `$table`");
        echo "✓ Dropped $table\n";
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "\n";

    // 3. Create stories table
    echo "Step 3: Creating stories table...\n";
    $pdo->exec("
        CREATE TABLE `stories` (
          `id` int NOT NULL AUTO_INCREMENT,
          `user_id` int NOT NULL,
          `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
          `theme` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `total_scenes` int NOT NULL DEFAULT '10',
          `thumbnail_url` text COLLATE utf8mb4_unicode_ci COMMENT 'R2 public URL for story thumbnail',
          `context_image_url` text COLLATE utf8mb4_unicode_ci COMMENT 'R2 public URL for context image',
          `selected_voice` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `voice_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `voice_name_for_tts` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `avatar_url` text COLLATE utf8mb4_unicode_ci,
          `music_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `music_file` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `music_volume` decimal(3,2) DEFAULT '0.50',
          `gamification_enabled` tinyint(1) DEFAULT '0',
          `question_timing` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'none' COMMENT 'during, after, both, none',
          `question_types` json DEFAULT NULL COMMENT 'Array of selected question types',
          `total_questions` int DEFAULT '0',
          `character_prompt` text COLLATE utf8mb4_unicode_ci,
          `status` enum('draft','uploading','complete','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'complete',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_user_id` (`user_id`),
          KEY `idx_created_at` (`created_at`),
          KEY `idx_status` (`status`),
          CONSTRAINT `stories_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main stories table with metadata'
    ");
    echo "✓ Created stories table\n\n";

    // 4. Create story_scenes table
    echo "Step 4: Creating story_scenes table...\n";
    $pdo->exec("
        CREATE TABLE `story_scenes` (
          `id` int NOT NULL AUTO_INCREMENT,
          `story_id` int NOT NULL,
          `scene_number` int NOT NULL,
          `narration` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full narration text',
          `narration_lines` json NOT NULL COMMENT 'Array of narration lines',
          `characters` json DEFAULT NULL COMMENT 'Array of character names',
          `visual_description` text COLLATE utf8mb4_unicode_ci,
          `image_url` text COLLATE utf8mb4_unicode_ci COMMENT 'R2 public URL for scene image',
          `scene_prompt` text COLLATE utf8mb4_unicode_ci COMMENT 'Image generation prompt',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `unique_story_scene` (`story_id`,`scene_number`),
          KEY `idx_story_id` (`story_id`),
          CONSTRAINT `story_scenes_ibfk_1` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Story scenes with narration and images'
    ");
    echo "✓ Created story_scenes table\n\n";

    // 5. Create story_scene_audio table
    echo "Step 5: Creating story_scene_audio table...\n";
    $pdo->exec("
        CREATE TABLE `story_scene_audio` (
          `id` int NOT NULL AUTO_INCREMENT,
          `scene_id` int NOT NULL,
          `line_number` int NOT NULL COMMENT '1-based index for narration line',
          `audio_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'R2 path: audio/story_{id}/scene_{num}_line_{line}.mp3',
          `audio_url` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'R2 public URL for audio file',
          `audio_text` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The text that was converted to speech',
          `file_size` int DEFAULT NULL COMMENT 'File size in bytes',
          `duration` decimal(10,3) DEFAULT NULL COMMENT 'Audio duration in seconds',
          `viseme_data` json DEFAULT NULL COMMENT 'ElevenLabs viseme/phoneme data for lip sync animation',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `unique_scene_audio` (`scene_id`,`line_number`),
          KEY `idx_scene_id` (`scene_id`),
          CONSTRAINT `story_scene_audio_ibfk_1` FOREIGN KEY (`scene_id`) REFERENCES `story_scenes` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audio files stored in Cloudflare R2'
    ");
    echo "✓ Created story_scene_audio table\n\n";

    // 6. Create story_gamification table
    echo "Step 6: Creating story_gamification table...\n";
    $pdo->exec("
        CREATE TABLE `story_gamification` (
          `id` int NOT NULL AUTO_INCREMENT,
          `story_id` int NOT NULL,
          `scene_id` int DEFAULT NULL COMMENT 'NULL for after-story questions',
          `question_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'during or after',
          `question` text COLLATE utf8mb4_unicode_ci NOT NULL,
          `choices` json NOT NULL COMMENT 'Array of choice options',
          `correct_answer` json DEFAULT NULL COMMENT 'Object with letter and text: {\"letter\": \"A\", \"text\": \"Answer text\"}',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_story_id` (`story_id`),
          KEY `idx_scene_id` (`scene_id`),
          KEY `idx_question_type` (`question_type`),
          CONSTRAINT `story_gamification_ibfk_1` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
          CONSTRAINT `story_gamification_ibfk_2` FOREIGN KEY (`scene_id`) REFERENCES `story_scenes` (`id`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Gamification questions for stories'
    ");
    echo "✓ Created story_gamification table\n\n";

    // 7. Create teacher_profiles table (with correct plural name)
    echo "Step 7: Creating teacher_profiles table...\n";
    $pdo->exec("
        CREATE TABLE `teacher_profiles` (
          `id` int NOT NULL AUTO_INCREMENT,
          `user_id` int DEFAULT NULL,
          `full_name` varchar(255) DEFAULT NULL,
          `position` varchar(255) DEFAULT NULL,
          `degree` varchar(255) DEFAULT NULL,
          `institution` varchar(255) DEFAULT NULL,
          `year_graduated` int DEFAULT NULL,
          `experience_years` int DEFAULT NULL,
          `experience_desc` text,
          `email` varchar(255) DEFAULT NULL,
          `certifications` text,
          `skills` text,
          `photo` varchar(255) DEFAULT NULL,
          `share_token` varchar(64) DEFAULT NULL,
          PRIMARY KEY (`id`),
          UNIQUE KEY `user_id` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ Created teacher_profiles table\n\n";

    // 8. Create user_settings table
    echo "Step 8: Creating user_settings table...\n";
    $pdo->exec("
        CREATE TABLE `user_settings` (
          `id` int NOT NULL AUTO_INCREMENT,
          `user_id` int NOT NULL,
          `voice_mode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Rachel' COMMENT 'Voice name or custom',
          `custom_voice_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ElevenLabs Voice ID for custom storyteller',
          `custom_voice_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Display name for custom voice',
          `custom_avatar_url` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'ReadyPlayerMe avatar URL for custom storyteller',
          `narration_volume` decimal(3,2) DEFAULT '1.00' COMMENT 'Narration volume 0.00 to 1.00',
          `background_music` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'gentle, playful, nature, or empty',
          `music_volume` decimal(3,2) DEFAULT '0.50' COMMENT 'Music volume 0.00 to 1.00',
          `question_timing` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'after' COMMENT 'during, after, both, none',
          `question_types` json DEFAULT NULL COMMENT 'Array of selected question types',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `unique_user_settings` (`user_id`),
          KEY `idx_user_id` (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User-specific story creation default settings'
    ");
    echo "✓ Created user_settings table\n\n";

    // Commit transaction
    $pdo->commit();

    echo "========================================\n";
    echo "✓ Schema sync completed successfully!\n";
    echo "========================================\n\n";

    // Verify tables
    echo "Verifying created tables:\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tables as $table) {
        echo "  ✓ $table\n";
    }

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
