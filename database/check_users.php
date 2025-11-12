<?php


require_once '../source/handlers/db_connection.php';

echo "Checking for users in the database...\n\n";

$result = $conn->query("SELECT id, email, first_name, last_name, created_at FROM users LIMIT 5");

if ($result && $result->num_rows > 0) {
    echo "Found " . $result->num_rows . " user(s):\n";
    echo str_repeat("-", 80) . "\n";
    printf("%-5s %-30s %-20s %-20s\n", "ID", "Email", "First Name", "Last Name");
    echo str_repeat("-", 80) . "\n";

    while ($row = $result->fetch_assoc()) {
        printf("%-5s %-30s %-20s %-20s\n",
            $row['id'],
            $row['email'],
            $row['first_name'],
            $row['last_name']
        );
    }
    echo str_repeat("-", 80) . "\n";
} else {
    echo "No users found in database.\n";
    echo "You need to register a user first before testing settings.\n";
}

$conn->close();
