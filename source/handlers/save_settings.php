<?php


session_start();
header('Content-Type: application/json');
error_reporting(0);


if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'User not logged in']);
    exit;
}

$user_id = $_SESSION['user_id'];
require_once __DIR__ . '/db_connection.php';


if (!$conn) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}


$voice_mode = trim($_POST['voice_mode'] ?? 'Rachel');
$custom_voice_id = trim($_POST['custom_voice_id'] ?? '');
$custom_voice_name = trim($_POST['custom_voice_name'] ?? '');
$custom_avatar_url = trim($_POST['custom_avatar_url'] ?? '');
$custom_voice_preview_url = trim($_POST['custom_voice_preview_url'] ?? '');
$narration_volume = floatval($_POST['narration_volume'] ?? 1.0);
$background_music = trim($_POST['background_music'] ?? '');
$music_volume = floatval($_POST['music_volume'] ?? 0.5);
$question_timing = trim($_POST['question_timing'] ?? 'after');
$question_types = $_POST['question_types'] ?? '[]';


$narration_volume = max(0, min(1, $narration_volume));
$music_volume = max(0, min(1, $music_volume));


$custom_voice_id = empty($custom_voice_id) ? null : $custom_voice_id;
$custom_voice_name = empty($custom_voice_name) ? null : $custom_voice_name;
$custom_avatar_url = empty($custom_avatar_url) ? null : $custom_avatar_url;
$custom_voice_preview_url = empty($custom_voice_preview_url) ? null : $custom_voice_preview_url;


$decoded = json_decode($question_types);
if ($decoded === null && $question_types !== '[]' && $question_types !== 'null') {
    
    $question_types = '[]';
}


$check_stmt = $conn->prepare("SELECT id FROM user_settings WHERE user_id = ?");
$check_stmt->bind_param("i", $user_id);
$check_stmt->execute();
$result = $check_stmt->get_result();
$settings_exist = $result->num_rows > 0;
$check_stmt->close();

if ($settings_exist) {
    
    $sql = "UPDATE user_settings SET
            voice_mode = ?,
            custom_voice_id = ?,
            custom_voice_name = ?,
            custom_avatar_url = ?,
            custom_voice_preview_url = ?,
            narration_volume = ?,
            background_music = ?,
            music_volume = ?,
            question_timing = ?,
            question_types = ?
            WHERE user_id = ?";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Failed to prepare update statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param(
        "sssssdsdssi",
        $voice_mode,
        $custom_voice_id,
        $custom_voice_name,
        $custom_avatar_url,
        $custom_voice_preview_url,
        $narration_volume,
        $background_music,
        $music_volume,
        $question_timing,
        $question_types,
        $user_id
    );
} else {
    
    $sql = "INSERT INTO user_settings (
                user_id, voice_mode, custom_voice_id, custom_voice_name,
                custom_avatar_url, custom_voice_preview_url, narration_volume, background_music,
                music_volume, question_timing, question_types
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Failed to prepare insert statement: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param(
        "isssssdsdss",
        $user_id,
        $voice_mode,
        $custom_voice_id,
        $custom_voice_name,
        $custom_avatar_url,
        $custom_voice_preview_url,
        $narration_volume,
        $background_music,
        $music_volume,
        $question_timing,
        $question_types
    );
}

$success = $stmt->execute();

if (!$success) {
    echo json_encode(['success' => false, 'error' => 'Database operation failed: ' . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

$stmt->close();
$conn->close();

echo json_encode([
    'success' => true,
    'message' => 'Settings saved successfully',
    'settings' => [
        'voice_mode' => $voice_mode,
        'custom_voice_id' => $custom_voice_id,
        'custom_voice_name' => $custom_voice_name,
        'custom_avatar_url' => $custom_avatar_url,
        'custom_voice_preview_url' => $custom_voice_preview_url,
        'narration_volume' => $narration_volume,
        'background_music' => $background_music,
        'music_volume' => $music_volume,
        'question_timing' => $question_timing,
        'question_types' => $question_types
    ]
]);
exit;
