<?php
/**
 * Migration: Add custom_voice_preview_url column to user_settings table
 * This migration adds support for storing custom voice preview URLs in the database
 */

require_once __DIR__ . '/../../source/handlers/db_connection.php';

echo "=== Migration: Add custom_voice_preview_url column ===\n\n";

try {
    // Check if column already exists
    $result = $conn->query("SHOW COLUMNS FROM user_settings LIKE 'custom_voice_preview_url'");

    if ($result->num_rows > 0) {
        echo "✓ Column 'custom_voice_preview_url' already exists. Skipping migration.\n";
        exit(0);
    }

    // Add the column
    echo "Adding column 'custom_voice_preview_url' to user_settings table...\n";

    $sql = "ALTER TABLE user_settings
            ADD COLUMN custom_voice_preview_url TEXT NULL
            AFTER custom_avatar_url";

    if ($conn->query($sql) === TRUE) {
        echo "✓ Column added successfully!\n";
        echo "\nMigration completed successfully.\n";
    } else {
        throw new Exception("Error adding column: " . $conn->error);
    }

} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

$conn->close();
?>
