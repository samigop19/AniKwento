<?php
/**
 * Generate Custom Voice Preview
 * Generates a preview audio for custom voices using the same text and settings as default voices
 * Saves the preview to R2 storage
 */

header('Content-Type: application/json');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized: User not logged in'
    ]);
    exit();
}

require_once __DIR__ . '/r2_storage.php';

// Load environment variables
require_once __DIR__ . '/../config/env.php';
EnvLoader::load();

// ElevenLabs API Configuration - Load from environment
$ELEVENLABS_API_KEY = EnvLoader::get('ELEVENLABS_API_KEY');
if (!$ELEVENLABS_API_KEY) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'ELEVENLABS_API_KEY not configured']);
    exit();
}
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';

// Standard preview text (same as generate_voice_previews.php)
const PREVIEW_TEXT = "Once upon a time, in a magical land filled with wonder, two curious children discovered an amazing adventure waiting just for them.";

// Voice settings (same as generate_voice_previews.php)
const VOICE_SETTINGS = [
    'model_id' => 'eleven_flash_v2_5',
    'voice_settings' => [
        'stability' => 0.33,
        'similarity_boost' => 1.0,
        'style' => 0.0,
        'use_speaker_boost' => true,
        'speed' => 0.80
    ]
];

try {
    // Get POST data
    $voiceId = $_POST['voice_id'] ?? '';
    $customVoiceKey = $_POST['custom_voice_key'] ?? ''; // e.g., "custom_1234567890"

    if (empty($voiceId)) {
        throw new Exception('Voice ID is required');
    }

    if (empty($customVoiceKey)) {
        throw new Exception('Custom voice key is required');
    }

    // Generate preview audio using ElevenLabs API
    $apiUrl = ELEVENLABS_API_URL . $voiceId;

    $postData = array_merge([
        'text' => PREVIEW_TEXT
    ], VOICE_SETTINGS);

    // Initialize cURL
    $ch = curl_init($apiUrl);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'xi-api-key: ' . $ELEVENLABS_API_KEY,
            'Content-Type: application/json',
            'Accept: audio/mpeg'
        ],
        CURLOPT_POSTFIELDS => json_encode($postData),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    // Execute request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);

    curl_close($ch);

    // Handle errors
    if ($curlError) {
        throw new Exception('API request failed: ' . $curlError);
    }

    if ($httpCode !== 200) {
        throw new Exception('ElevenLabs API error (HTTP ' . $httpCode . '): ' . substr($response, 0, 200));
    }

    // Convert audio to base64
    $base64Audio = base64_encode($response);

    // Upload to R2
    $r2 = new R2Storage();
    $r2Path = 'voice-previews/' . $customVoiceKey . '-preview.mp3';

    $uploadResult = $r2->uploadAudio($base64Audio, $r2Path);

    if (!$uploadResult['success']) {
        throw new Exception('Failed to upload to R2: ' . $uploadResult['error']);
    }

    // Return success with R2 URL
    echo json_encode([
        'success' => true,
        'preview_url' => $uploadResult['url'],
        'message' => 'Custom voice preview generated successfully',
        'file_size' => $uploadResult['size']
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
