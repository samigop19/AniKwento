<?php
/**
 * Save Voice Preview Cache
 * Saves generated voice previews to cache folder to avoid repeated API calls
 */

header('Content-Type: application/json');

// Define cache directory
$cacheDir = '../../public/files/voice-previews/';

// Create directory if it doesn't exist
if (!file_exists($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Allowed voice files for security
$allowedFiles = [
    'Rachel' => 'rachel-preview.mp3',
    'Amara' => 'amara-preview.mp3',
    'Lily' => 'lily-preview.mp3'
];

try {
    // Check if audio file was uploaded
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No audio file uploaded');
    }

    // Get voice name
    $voiceName = $_POST['voice_name'] ?? '';

    // Validate voice name
    if (!isset($allowedFiles[$voiceName])) {
        throw new Exception('Invalid voice name');
    }

    $fileName = $allowedFiles[$voiceName];
    $filePath = $cacheDir . $fileName;

    // Move uploaded file to cache directory
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
