<?php
/**
 * OpenRouter AI Completion API Handler
 * Generates story content and scene descriptions
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

// OpenRouter API Configuration - Load from environment
$OPENROUTER_API_KEY = EnvLoader::get('OPENROUTER_API_KEY');
if (!$OPENROUTER_API_KEY) {
    error_log("❌ ERROR: OPENROUTER_API_KEY not set in environment");
    http_response_code(500);
    echo json_encode(['error' => 'API key not configured']);
    exit();
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Log request for debugging
error_log("============ OPENROUTER COMPLETION REQUEST ============");
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);

// Get and decode the request body
$input = file_get_contents('php://input');
error_log("Raw input: " . $input);

$data = json_decode($input, true);

if (!$data) {
    error_log("❌ ERROR: Invalid JSON in request body");
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON in request body']);
    exit();
}

// Validate required fields
if (!isset($data['prompt'])) {
    error_log("❌ ERROR: Missing required field: prompt");
    http_response_code(400);
    echo json_encode(['error' => 'Missing required field: prompt']);
    exit();
}

// Get parameters from request with defaults
$prompt = $data['prompt'];
$model = $data['model'] ?? 'google/gemini-2.0-flash-exp:free';
$maxTokens = $data['max_tokens'] ?? 4000;
$temperature = $data['temperature'] ?? 0.7;

error_log("Prompt length: " . strlen($prompt));
error_log("Model: " . $model);
error_log("Max tokens: " . $maxTokens);
error_log("Temperature: " . $temperature);

// Prepare the API request
$requestData = [
    'model' => $model,
    'messages' => [
        [
            'role' => 'system',
            'content' => 'You are a helpful assistant specialized in creating children\'s stories and educational content. IMPORTANT: You must NEVER generate any adult content, sexual themes, violence, or inappropriate material. All content must be 100% child-safe, educational, and suitable for ages 3-10. Focus on positive values like friendship, learning, and kindness.'
        ],
        [
            'role' => 'user',
            'content' => $prompt
        ]
    ],
    'max_tokens' => $maxTokens,
    'temperature' => $temperature
];

$headers = [
    'Authorization: Bearer ' . $OPENROUTER_API_KEY,
    'Content-Type: application/json',
    'HTTP-Referer: ' . ($_SERVER['HTTP_REFERER'] ?? 'https://anikwento-web-production.up.railway.app'),
    'X-Title: AniKwento Story Generator'
];

// Initialize cURL
$ch = curl_init(OPENROUTER_API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_TIMEOUT, 60); // 60 second timeout

error_log("Sending request to OpenRouter API...");

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

curl_close($ch);

error_log("HTTP Response Code: " . $httpCode);

// Handle cURL errors
if ($curlError) {
    error_log("❌ cURL Error: " . $curlError);
    http_response_code(500);
    echo json_encode(['error' => 'API request failed: ' . $curlError]);
    exit();
}

// Handle HTTP errors
if ($httpCode !== 200) {
    error_log("❌ OpenRouter API Error (HTTP $httpCode): " . $response);
    http_response_code($httpCode);
    echo json_encode(['error' => 'OpenRouter API error', 'details' => json_decode($response, true)]);
    exit();
}

// Parse response
$responseData = json_decode($response, true);

if (!$responseData) {
    error_log("❌ ERROR: Invalid JSON response from OpenRouter");
    http_response_code(500);
    echo json_encode(['error' => 'Invalid response from OpenRouter API']);
    exit();
}

// Validate response structure
if (!isset($responseData['choices']) || empty($responseData['choices'])) {
    error_log("❌ ERROR: No choices in OpenRouter response");
    http_response_code(500);
    echo json_encode(['error' => 'Invalid response structure from OpenRouter API', 'response' => $responseData]);
    exit();
}

// Extract the completion
$completion = $responseData['choices'][0]['message']['content'] ?? null;

if (!$completion) {
    error_log("❌ ERROR: No content in OpenRouter response");
    http_response_code(500);
    echo json_encode(['error' => 'No content in OpenRouter response', 'response' => $responseData]);
    exit();
}

error_log("✅ OpenRouter API call successful");
error_log("Response length: " . strlen($completion));

// Return the completion
echo json_encode([
    'success' => true,
    'content' => $completion,
    'model' => $model,
    'usage' => $responseData['usage'] ?? null
]);
