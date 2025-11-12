<?php


require_once '../source/handlers/db_connection.php';


mysqli_report(MYSQLI_REPORT_OFF);

echo "=== AniKwento Database Setup ===\n\n";


$migrations = [
    'users.sql',
    'pending_users.sql',
    'teacher_profiles.sql',
    'add_user_id_to_teacher_profiles.sql',
    'user_settings.sql'
];

$success = true;

foreach ($migrations as $migrationFile) {
    $sqlFile = __DIR__ . '/migrations/' . $migrationFile;

    echo "\n" . str_repeat("=", 80) . "\n";
    echo "Running migration: $migrationFile\n";
    echo str_repeat("=", 80) . "\n";

    if (!file_exists($sqlFile)) {
        echo "⚠ Warning: Migration file not found, skipping...\n";
        continue;
    }

    $sql = file_get_contents($sqlFile);

    
    
    if ($conn->multi_query($sql)) {
        do {
            
            if ($result = $conn->store_result()) {
                $result->free();
            }

            
            if ($conn->errno) {
                $error = $conn->error;
                $errno = $conn->errno;

                
                if ($errno == 1050 || stripos($error, 'already exists') !== false ||
                    $errno == 1060 || stripos($error, 'Duplicate column') !== false ||
                    $errno == 1061 || stripos($error, 'Duplicate key') !== false) {
                    
                } else {
                    echo "⚠ Warning: $error\n";
                }
            }

            
            if ($conn->more_results()) {
                @$conn->next_result();
            }
        } while ($conn->more_results());

        echo "✓ Migration completed successfully\n";
    } else {
        $error = $conn->error;
        $errno = $conn->errno;

        
        if ($errno == 1050 || stripos($error, 'already exists') !== false) {
            echo "✓ Tables already exist (skipped)\n";
        } else {
            echo "✗ Error: $error\n";
            if (stripos($error, 'Duplicate column') === false) {
                $success = false;
            }
        }
    }
}


echo "\n" . str_repeat("=", 80) . "\n";
echo "Verifying database setup...\n";
echo str_repeat("=", 80) . "\n\n";

$criticalTables = ['users', 'user_settings', 'teacher_profiles'];
$allTablesExist = true;

foreach ($criticalTables as $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    if ($result && $result->num_rows > 0) {
        echo "✓ Table '$table' exists\n";
    } else {
        echo "✗ Table '$table' is missing!\n";
        $allTablesExist = false;
        $success = false;
    }
}

if ($allTablesExist) {
    echo "\n" . str_repeat("=", 80) . "\n";
    echo "Database structure for user_settings:\n";
    echo str_repeat("=", 80) . "\n";

    $structure = $conn->query("DESCRIBE user_settings");
    if ($structure) {
        printf("\n%-25s %-20s %-8s %-8s %-15s\n",
            "Field", "Type", "Null", "Key", "Default");
        echo str_repeat("-", 80) . "\n";

        while ($row = $structure->fetch_assoc()) {
            printf("%-25s %-20s %-8s %-8s %-15s\n",
                $row['Field'],
                substr($row['Type'], 0, 20),
                $row['Null'],
                $row['Key'],
                substr($row['Default'] ?? 'NULL', 0, 15)
            );
        }
    }
}

$conn->close();

echo "\n" . str_repeat("=", 80) . "\n";
if ($success && $allTablesExist) {
    echo "✓ Database setup completed successfully!\n";
    echo "✓ All tables are ready for use.\n";
    exit(0);
} else {
    echo "✗ Database setup encountered errors.\n";
    echo "Please check the errors above and try again.\n";
    exit(1);
}
