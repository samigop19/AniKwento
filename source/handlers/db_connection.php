<?php



require_once __DIR__ . '/../config/env.php';
EnvLoader::load();



$host = EnvLoader::get('DB_HOST', EnvLoader::get('MYSQLHOST', 'localhost'));
$user = EnvLoader::get('DB_USERNAME', EnvLoader::get('MYSQLUSER', 'root'));
$pass = EnvLoader::get('DB_PASSWORD', EnvLoader::get('MYSQLPASSWORD', 'root'));
$dbname = EnvLoader::get('DB_NAME', EnvLoader::get('MYSQLDATABASE', 'anikwento'));


$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
  
  error_log("Database connection failed: " . $conn->connect_error);
  $db_error = $conn->connect_error;
} else {
  
  $conn->set_charset('utf8mb4');
}