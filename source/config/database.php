<?php

require_once __DIR__ . '/env.php';


$servername = EnvLoader::get('DB_HOST', 'localhost');
$username = EnvLoader::get('DB_USERNAME', 'root');
$password = EnvLoader::get('DB_PASSWORD', '');
$dbname = EnvLoader::get('DB_NAME', 'anikwento_db');


$conn = new mysqli($servername, $username, $password, $dbname);


if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}


try {
    $pdo = new PDO(
        "mysql:host=$servername;dbname=$dbname",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>