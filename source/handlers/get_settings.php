<?php



ob_start();

session_start();
header('Content-Type: application/json');


if (!isset($_SESSION['user_id'])) {
    ob_clean(); 
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
require_once __DIR__ . '/db_connection.php';


if (!$conn) {
    ob_clean(); 
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}


$stmt = $conn->prepare("SELECT * FROM user_settings WHERE user_id = ?");

if (!$stmt) {
    ob_clean(); 
    echo json_encode(['success' => false, 'error' => 'Failed to prepare statement: ' . $conn->error]);
    exit;
}

$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    
    ob_clean(); 
    echo json_encode([
        'success' => true,
        'settings' => [
            'voice_mode' => $row['voice_mode'],
            'custom_voice_id' => $row['custom_voice_id'],
            'custom_voice_name' => $row['custom_voice_name'],
            'custom_avatar_url' => $row['custom_avatar_url'],
            'custom_voice_preview_url' => $row['custom_voice_preview_url'],
            'narration_volume' => floatval($row['narration_volume']),
            'background_music' => $row['background_music'],
            'music_volume' => floatval($row['music_volume']),
            'question_timing' => $row['question_timing'],
            'question_types' => $row['question_types']
        ]
    ]);
} else {
    
    ob_clean(); 
    echo json_encode([
        'success' => true,
        'settings' => [
            'voice_mode' => 'Rachel',
            'custom_voice_id' => null,
            'custom_voice_name' => null,
            'custom_avatar_url' => null,
            'custom_voice_preview_url' => null,
            'narration_volume' => 0.5,
            'background_music' => '',
            'music_volume' => 0.5,
            'question_timing' => 'none',
            'question_types' => '[]'
        ],
        'is_default' => true
    ]);
}

$stmt->close();
$conn->close();
exit;
