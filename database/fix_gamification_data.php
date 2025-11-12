<?php
/**
 * Fix Gamification Data Script
 * Migrates correct_answer column from VARCHAR to JSON
 * and cleans up any "Array" values in the database
 */

require_once __DIR__ . '/../source/handlers/db_connection.php';

echo "=================================================================\n";
echo "Fix Gamification Data Migration\n";
echo "=================================================================\n\n";

try {
    // Step 1: Check current data
    echo "Step 1: Checking current gamification data...\n";
    $checkQuery = "SELECT id, question, correct_answer FROM story_gamification LIMIT 5";
    $result = $conn->query($checkQuery);

    echo "Sample of current data:\n";
    echo str_repeat("-", 80) . "\n";
    printf("%-10s %-40s %-30s\n", "ID", "Question (truncated)", "Correct Answer");
    echo str_repeat("-", 80) . "\n";

    while ($row = $result->fetch_assoc()) {
        $questionPreview = substr($row['question'], 0, 37) . '...';
        printf("%-10d %-40s %-30s\n",
            $row['id'],
            $questionPreview,
            $row['correct_answer']
        );
    }
    echo str_repeat("-", 80) . "\n\n";

    // Step 2: Count rows with "Array" values
    $countQuery = "SELECT COUNT(*) as count FROM story_gamification WHERE correct_answer = 'Array' OR correct_answer = ''";
    $countResult = $conn->query($countQuery);
    $countRow = $countResult->fetch_assoc();
    $problematicCount = $countRow['count'];

    echo "Step 2: Found $problematicCount rows with 'Array' or empty values\n\n";

    // Step 3: First, allow NULL values in the column
    echo "Step 3: Allowing NULL values in correct_answer column...\n";
    $allowNullQuery = "ALTER TABLE story_gamification
                       MODIFY COLUMN correct_answer VARCHAR(255) NULL";
    if ($conn->query($allowNullQuery)) {
        echo "✓ Column now allows NULL values\n\n";
    } else {
        // Check if already allows NULL
        if (strpos($conn->error, 'already') !== false) {
            echo "✓ Column already allows NULL values\n\n";
        } else {
            throw new Exception("Failed to allow NULL: " . $conn->error);
        }
    }

    // Step 4: Clean problematic data
    if ($problematicCount > 0) {
        echo "Step 4: Cleaning 'Array' values (setting to NULL)...\n";
        $cleanQuery = "UPDATE story_gamification SET correct_answer = NULL WHERE correct_answer = 'Array' OR correct_answer = ''";
        if ($conn->query($cleanQuery)) {
            echo "✓ Cleaned $problematicCount rows\n\n";
        } else {
            throw new Exception("Failed to clean data: " . $conn->error);
        }
    } else {
        echo "Step 4: No cleaning needed - all data is valid\n\n";
    }

    // Step 5: Alter column type to JSON
    echo "Step 5: Altering column type from VARCHAR to JSON...\n";
    $alterQuery = "ALTER TABLE story_gamification
                   MODIFY COLUMN correct_answer JSON NULL
                   COMMENT 'Object with letter and text: {\"letter\": \"A\", \"text\": \"Answer text\"}'";

    if ($conn->query($alterQuery)) {
        echo "✓ Column type changed to JSON\n\n";
    } else {
        // Check if column is already JSON
        if ($conn->errno == 1060 || strpos($conn->error, 'already') !== false) {
            echo "✓ Column is already JSON type\n\n";
        } else {
            throw new Exception("Failed to alter column: " . $conn->error);
        }
    }

    // Step 6: Verify the change
    echo "Step 6: Verifying column structure...\n";
    $descQuery = "DESCRIBE story_gamification";
    $descResult = $conn->query($descQuery);

    while ($row = $descResult->fetch_assoc()) {
        if ($row['Field'] === 'correct_answer') {
            echo "Column 'correct_answer' type: " . $row['Type'] . "\n";
            echo "Null allowed: " . $row['Null'] . "\n";
            echo "Comment: " . $row['Comment'] . "\n";
        }
    }

    echo "\n" . str_repeat("=", 80) . "\n";
    echo "✅ Migration completed successfully!\n";
    echo str_repeat("=", 80) . "\n\n";

    echo "IMPORTANT NOTES:\n";
    echo "1. All gamification questions with 'Array' values have been reset to NULL\n";
    echo "2. You will need to regenerate stories with gamification to populate correct data\n";
    echo "3. New stories will automatically save correct_answer as proper JSON\n";
    echo "4. The storyboard will now correctly display correct answers\n\n";

} catch (Exception $e) {
    echo "\n❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

$conn->close();
?>
