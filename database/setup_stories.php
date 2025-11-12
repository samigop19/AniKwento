<?php
/**
 * Database Setup Script for Story Saving Feature
 * Run this script to create all story-related tables
 *
 * Tables created:
 * - stories (main stories table)
 * - story_scenes (story scenes with narration)
 * - story_scene_audio (audio files in Cloudflare R2)
 * - story_gamification (quiz questions)
 */

require_once '../source/handlers/db_connection.php';

echo "Setting up story-related tables...\n\n";

// Read the SQL migration file
$sqlFile = __DIR__ . '/migrations/stories.sql';

if (!file_exists($sqlFile)) {
    die("Error: Migration file not found at $sqlFile\n");
}

$sql = file_get_contents($sqlFile);

// Split by semicolons to get individual statements
// Remove comments and filter statements
$statements = array_filter(
    array_map('trim', explode(';', $sql)),
    function($stmt) {
        // Skip empty statements
        if (empty($stmt)) return false;

        // Skip SQL comments (lines starting with --)
        $lines = explode("\n", $stmt);
        $nonCommentLines = array_filter($lines, function($line) {
            $trimmed = trim($line);
            return !empty($trimmed) && !str_starts_with($trimmed, '--');
        });

        // Reconstruct statement without comments
        $cleanStmt = implode("\n", $nonCommentLines);
        $cleanStmt = trim($cleanStmt);

        // Skip if empty after removing comments
        if (empty($cleanStmt)) return false;

        // Skip transaction and SET statements
        if (stripos($cleanStmt, 'START TRANSACTION') !== false) return false;
        if (stripos($cleanStmt, 'COMMIT') !== false) return false;
        if (stripos($cleanStmt, 'SET ') === 0) return false;

        return true;
    }
);

// Clean statements by removing comments
$statements = array_map(function($stmt) {
    $lines = explode("\n", $stmt);
    $nonCommentLines = array_filter($lines, function($line) {
        $trimmed = trim($line);
        return !empty($trimmed) && !str_starts_with($trimmed, '--');
    });
    return implode("\n", $nonCommentLines);
}, $statements);

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

// Verify all tables were created
$tables = ['stories', 'story_scenes', 'story_scene_audio', 'story_gamification'];
$allTablesExist = true;

echo "\n" . str_repeat("=", 80) . "\n";
echo "Verifying tables...\n";
echo str_repeat("=", 80) . "\n";

foreach ($tables as $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    if ($result && $result->num_rows > 0) {
        echo "✓ $table table is ready!\n";
    } else {
        echo "✗ $table table NOT found\n";
        $allTablesExist = false;
        $success = false;
    }
}

if ($allTablesExist) {
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "Stories Table Structure:\n";
    echo str_repeat("=", 80) . "\n";

    $structure = $conn->query("DESCRIBE stories");
    printf("%-30s %-20s %-10s\n", "Field", "Type", "Null");
    echo str_repeat("-", 80) . "\n";

    while ($row = $structure->fetch_assoc()) {
        printf("%-30s %-20s %-10s\n",
            $row['Field'],
            substr($row['Type'], 0, 20),
            $row['Null']
        );
    }
    echo str_repeat("=", 80) . "\n";
}

$conn->close();

if ($success) {
    echo "\n✅ Database setup completed successfully!\n";
    echo "All story-related tables are ready to use.\n";
    echo "\nNext steps:\n";
    echo "1. Test R2 connection: http://localhost:8888/source/handlers/test_r2.php\n";
    echo "2. Use save_story.php to save stories\n";
    exit(0);
} else {
    echo "\n❌ Database setup encountered errors.\n";
    exit(1);
}
?>
