<?php
/**
 * Database Connection Handler
 * Loads database credentials from environment variables
 */

// Load environment variables
require_once __DIR__ . '/../config/env.php';
EnvLoader::load();

// Get database configuration from environment
// Try Railway variables first, then fall back to our custom variable names
$host = EnvLoader::get('DB_HOST', EnvLoader::get('MYSQLHOST', 'localhost'));
$user = EnvLoader::get('DB_USERNAME', EnvLoader::get('MYSQLUSER', 'root'));
$pass = EnvLoader::get('DB_PASSWORD', EnvLoader::get('MYSQLPASSWORD', 'root'));
$dbname = EnvLoader::get('DB_NAME', EnvLoader::get('MYSQLDATABASE', 'anikwento'));

// Create database connection
$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
  // Don't use die() - let the calling script handle the error
  error_log("Database connection failed: " . $conn->connect_error);
  $db_error = $conn->connect_error;
} else {
  // Set charset to UTF8MB4 for full Unicode support
  $conn->set_charset('utf8mb4');
}