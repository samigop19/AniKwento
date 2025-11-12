<?php


header('Content-Type: application/json');


$cacheDir = '../../public/files/voice-previews/';


if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}


$allowedFiles = [
    'Rachel' => 'rachel-preview.mp3',
    'Amara' => 'amara-preview.mp3',
    'Lily' => 'lily-preview.mp3'
];

try {
    
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No audio file uploaded');
    }

    
    $voiceName = $_POST['voice_name'] ?? '';

    
    if (!isset($allowedFiles[$voiceName])) {
        throw new Exception('Invalid voice name');
    }

    $fileName = $allowedFiles[$voiceName];
    $filePath = $cacheDir . $fileName;

    
    if (move_uploaded_file($_FILES['audio']['tmp_name'], $filePath)) {
        echo json_encode([
            'success' => true,
            'message' => 'Voice preview cached successfully',
            'file' => $fileName
        ]);
    } else {
        throw new Exception('Failed to save cached file');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
