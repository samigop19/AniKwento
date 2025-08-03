<?php
require_once 'source/config/database.php';

$email = $_POST['email'];
$password = password_hash($_POST['password'], PASSWORD_DEFAULT);
$role = $_POST['role'];

$sql = "INSERT INTO users (email, password, role) VALUES (?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sss", $email, $password, $role);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'User added successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error adding user']);
}

$stmt->close();
$conn->close();
?>