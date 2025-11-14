<?php
/**
 * ElevenLabs Text-to-Speech API Handler
 * Generates audio narration for story scenes
 */

// Load environment variables
require_once __DIR__ . '/../config/env.php';
EnvLoader::load();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// ElevenLabs API Configuration - Load from environment
$ELEVENLABS_API_KEY = EnvLoader::get('ELEVENLABS_API_KEY');
if (!$ELEVENLABS_API_KEY) {
    error_log("❌ ERROR: ELEVENLABS_API_KEY not set in environment");
    http_response_code(500);
    echo json_encode(['error' => 'API key not configured']);
    exit();
}
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';

// Voice ID mapping for storyteller voices
const VOICE_IDS = array(
    'Rachel' => '21m00Tcm4TlvDq8ikWAM',  // Rachel - calm and gentle
    'Amara' => 'GEcKlrQ1MWkJKoc7UTJd',   // Amara - warm and engaging narrator
    'Lily' => 'qBDvhofpxp92JgXJxDjB'     // Lily - friendly and expressive voice
);

// Log request for debugging
error_log("============ ELEVENLABS TTS REQUEST ============");
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
error_log("Request time: " . date('Y-m-d H:i:s'));

// Get request data
$rawInput = file_get_contents('php://input');
error_log("Raw input length: " . strlen($rawInput));
error_log("Raw input (first 200 chars): " . substr($rawInput, 0, 200));

$input = json_decode($rawInput, true);

if (!$input) {
    error_log("❌ ERROR: Invalid JSON input");
    error_log("JSON decode error: " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input', 'details' => json_last_error_msg()]);
    exit();
}

error_log("✅ JSON decoded successfully");
error_log("Input data: " . json_encode($input));

// Validate required fields
if (!isset($input['text']) || !isset($input['voice'])) {
    error_log("❌ ERROR: Missing required fields");
    error_log("Has text: " . (isset($input['text']) ? 'yes' : 'no'));
    error_log("Has voice: " . (isset($input['voice']) ? 'yes' : 'no'));
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: text and voice']);
    exit();
}

$text = trim($input['text']);
$voiceName = $input['voice'];

error_log("Text: " . substr($text, 0, 100) . (strlen($text) > 100 ? '...' : ''));
error_log("Voice: " . $voiceName);

// Determine voice ID - handle preset voices, custom voice keys, and direct ElevenLabs voice IDs
if (isset(VOICE_IDS[$voiceName])) {
    // Standard preset voice
    $voiceId = VOICE_IDS[$voiceName];
    error_log("✅ Using preset voice: " . $voiceName . " (ID: " . $voiceId . ")");
} elseif (strpos($voiceName, 'custom_') === 0) {
    // Custom voice - need to look up the voice_id from database
    error_log("🔍 Looking up custom voice: " . $voiceName);

    require_once __DIR__ . '/db_connection.php';

    $stmt = $conn->prepare("SELECT voice_id, voice_name FROM custom_voices WHERE voice_key = ?");
    $stmt->bind_param("s", $voiceName);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $customVoice = $result->fetch_assoc();
        $voiceId = $customVoice['voice_id'];
        $customVoiceName = $customVoice['voice_name'];
        error_log("✅ Found custom voice: " . $customVoiceName . " (Key: " . $voiceName . ", ID: " . $voiceId . ")");
        $stmt->close();
        $conn->close();
    } else {
        error_log("❌ ERROR: Custom voice not found: " . $voiceName);
        $stmt->close();
        $conn->close();
        http_response_code(400);
        echo json_encode(['error' => 'Custom voice not found: ' . $voiceName]);
        exit();
    }
} else {
    // Assume it's a direct ElevenLabs voice ID (alphanumeric strings, typically 20 characters)
    if (preg_match('/^[a-zA-Z0-9]{15,30}$/', $voiceName)) {
        $voiceId = $voiceName;
        error_log("✅ Using direct ElevenLabs voice ID: " . $voiceId);
    } else {
        error_log("❌ ERROR: Invalid voice name or ID: " . $voiceName);
        http_response_code(400);
        echo json_encode(['error' => 'Invalid voice name or ID. Use: Rachel, Amara, Lily, or a valid ElevenLabs voice ID']);
        exit();
    }
}

// Prepare ElevenLabs API request with alignment data for lip sync
$apiUrl = ELEVENLABS_API_URL . $voiceId . '/with-timestamps';
error_log("🌐 ElevenLabs API URL: " . $apiUrl);

$requestData = [
    'text' => $text,
    'model_id' => 'eleven_flash_v2_5',  // Eleven Flash v2.5
    'voice_settings' => [
        'stability' => 0.33,             // 33%
        'similarity_boost' => 1.0,       // 100%
        'style' => 0.0,                  // 0%
        'use_speaker_boost' => true,     // Speaker boost enabled
        'speed' => 0.80                  // Speed: 0.80
    ]
];

// Initialize cURL
$ch = curl_init($apiUrl);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'xi-api-key: ' . $ELEVENLABS_API_KEY,
        'Content-Type: application/json',
        'Accept: application/json'  // Changed to JSON to receive alignment data
    ],
    CURLOPT_POSTFIELDS => json_encode($requestData),
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true
]);

// Execute request
error_log("📤 Sending request to ElevenLabs...");
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

error_log("📥 Response received");
error_log("HTTP Code: " . $httpCode);
error_log("cURL Error: " . ($error ?: 'none'));
error_log("Response length: " . strlen($response));
error_log("Response (first 200 chars): " . substr($response, 0, 200));

curl_close($ch);

// Handle errors
if ($error) {
    error_log("❌ cURL error occurred");
    http_response_code(500);
    echo json_encode(['error' => 'cURL error: ' . $error]);
    exit();
}

if ($httpCode !== 200) {
    error_log("❌ ElevenLabs API returned non-200 status: " . $httpCode);
    error_log("Error response: " . $response);
    http_response_code($httpCode);
    echo json_encode(['error' => 'ElevenLabs API error', 'details' => $response, 'http_code' => $httpCode]);
    exit();
}

// Parse the JSON response which contains audio and alignment data
$responseData = json_decode($response, true);

if (!$responseData) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to parse ElevenLabs response']);
    exit();
}

// Extract audio and alignment data
$audioBase64 = isset($responseData['audio_base64']) ? $responseData['audio_base64'] : null;
$alignment = isset($responseData['alignment']) ? $responseData['alignment'] : null;

if (!$audioBase64) {
    http_response_code(500);
    echo json_encode(['error' => 'No audio data in response']);
    exit();
}

// Process alignment data to extract visemes/phonemes for lip sync
$visemeData = [];
if ($alignment && isset($alignment['characters']) && isset($alignment['character_start_times_seconds']) && isset($alignment['character_end_times_seconds'])) {
    // ElevenLabs provides character-level alignment, we need to convert to phonemes
    // For now, we'll create a simple mapping based on character sounds
    $characters = $alignment['characters'];
    $startTimes = $alignment['character_start_times_seconds'];
    $endTimes = $alignment['character_end_times_seconds'];

    for ($i = 0; $i < count($characters); $i++) {
        $char = strtolower($characters[$i]);
        $phoneme = mapCharacterToPhoneme($char);

        if ($phoneme) {
            $visemeData[] = [
                'phoneme' => $phoneme,
                'start_time' => $startTimes[$i],
                'end_time' => $endTimes[$i]
            ];
        }
    }
}

// Return success response with audio data and viseme data
$successResponse = [
    'success' => true,
    'audio' => $audioBase64,
    'voice' => $voiceName,
    'text' => $text,
    'format' => 'audio/mpeg',
    'viseme_data' => $visemeData,
    'has_viseme_data' => count($visemeData) > 0
];

error_log("✅ TTS generation successful!");
error_log("Audio length: " . strlen($audioBase64));
error_log("Viseme data points: " . count($visemeData));
error_log("============================================\n");

echo json_encode($successResponse);

/**
 * Map a character to its phoneme for lip sync
 * This is a simplified mapping - ideally would use a proper phoneme library
 */
function mapCharacterToPhoneme($char) {
    // Vowels
    if (in_array($char, ['a', 'á', 'à', 'â'])) return 'a';
    if (in_array($char, ['e', 'é', 'è', 'ê'])) return 'e';
    if (in_array($char, ['i', 'í', 'ì', 'î'])) return 'i';
    if (in_array($char, ['o', 'ó', 'ò', 'ô'])) return 'o';
    if (in_array($char, ['u', 'ú', 'ù', 'û'])) return 'u';

    // Consonants
    if (in_array($char, ['p', 'b'])) return 'p';
    if ($char === 'm') return 'm';
    if (in_array($char, ['f', 'v'])) return 'f';
    if (in_array($char, ['d', 't'])) return 'd';
    if ($char === 'n') return 'n';
    if (in_array($char, ['k', 'c', 'q', 'g'])) return 'k';
    if (in_array($char, ['s', 'z', 'x'])) return 's';
    if ($char === 'r') return 'r';
    if ($char === 'l') return 'l';
    if (in_array($char, ['j', 'y'])) return 'j';
    if ($char === 'w') return 'u';
    if ($char === 'h') return null; // Silent

    // Spaces and punctuation
    if (in_array($char, [' ', ',', '.', '!', '?', '-'])) return 'sil';

    return null;
}
