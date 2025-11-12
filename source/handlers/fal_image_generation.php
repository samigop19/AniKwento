<?php
/**
 * Fal.ai Image Generation API Handler
 * Generates images using Fal.ai's nano-banana models
 * Supports: thumbnail, context character, and scene images
 */

// Load environment variables
require_once __DIR__ . '/../config/env.php';
EnvLoader::load();

// Enable error logging for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in output
ini_set('log_errors', 1);
ini_set('max_execution_time', 150); // Increase PHP execution time to 150 seconds
error_log("=== Fal.ai Image Generation Handler Started ===");

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

// Fal.ai API Configuration - Load from environment
$FAL_KEY = EnvLoader::get('FAL_API_KEY');
if (!$FAL_KEY) {
    error_log("❌ ERROR: FAL_API_KEY not set in environment");
    http_response_code(500);
    echo json_encode(['error' => 'API key not configured']);
    exit();
}
const FAL_API_URL = 'https://fal.run'; // Fixed: was queue.fal.run

// Get request data
$rawInput = file_get_contents('php://input');
error_log("Received input: " . substr($rawInput, 0, 200));

$input = json_decode($rawInput, true);

if (!$input) {
    error_log("ERROR: Invalid JSON input - " . json_last_error_msg());
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit();
}

// Validate required fields
if (!isset($input['prompt']) || !isset($input['type'])) {
    error_log("ERROR: Missing required fields");
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: prompt and type']);
    exit();
}

$prompt = trim($input['prompt']);
$type = $input['type']; // 'thumbnail', 'context', 'thumbnail_with_context', or 'scene'
error_log("Processing request - Type: $type, Prompt: " . substr($prompt, 0, 100));

// Determine which model to use
$model = '';
$requestData = [];

switch ($type) {
    case 'thumbnail':
    case 'context':
        // Use nano-banana for thumbnail and context character images
        $model = 'fal-ai/nano-banana';
        // Send parameters at root level (not wrapped in "input")
        $requestData = [
            'prompt' => $prompt,
            'num_images' => 1,
            'aspect_ratio' => '16:9',
            'output_format' => 'png',
            'num_inference_steps' => 100,  // Increased to 100 for higher quality thumbnails (90-120 range)
            'enable_safety_checker' => false
        ];
        break;

    case 'thumbnail_with_context':
        // Use nano-banana/edit for thumbnail with character reference
        $model = 'fal-ai/nano-banana/edit';

        if (!isset($input['reference_image'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Thumbnail with context requires reference_image parameter']);
            exit();
        }

        // Send parameters at root level (not wrapped in "input")
        $requestData = [
            'prompt' => $prompt,
            'image_urls' => [$input['reference_image']],  // Must be an array
            'num_images' => 1,
            'aspect_ratio' => '16:9',
            'output_format' => 'png',
            'num_inference_steps' => 100,  // Increased to 100 for higher quality thumbnails with context (90-120 range)
            'enable_safety_checker' => false
        ];
        break;

    case 'scene':
        // Use nano-banana/edit for scene images with character reference
        $model = 'fal-ai/nano-banana/edit';

        if (!isset($input['reference_image'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Scene images require reference_image parameter']);
            exit();
        }

        // Send parameters at root level (not wrapped in "input")
        $requestData = [
            'prompt' => $prompt,
            'image_urls' => [$input['reference_image']],  // Must be an array
            'num_images' => 1,
            'aspect_ratio' => '16:9',
            'output_format' => 'png',
            'num_inference_steps' => 100,  // Increased to 100 for higher quality scene images (90-120 range)
            'enable_safety_checker' => false
        ];
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid type. Use: thumbnail, context, thumbnail_with_context, or scene']);
        exit();
}

// Submit job to Fal.ai queue
$submitUrl = FAL_API_URL . '/' . $model;
error_log("Submitting to URL: $submitUrl");
error_log("Request data: " . json_encode($requestData));

$ch = curl_init($submitUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Key ' . $FAL_KEY,
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode($requestData),
    CURLOPT_TIMEOUT => 120,  // Timeout for fal.ai API response
    CURLOPT_CONNECTTIMEOUT => 30,  // Connection timeout
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

error_log("Submit response HTTP code: $httpCode");
error_log("Submit response: " . substr($response, 0, 500));

if ($curlError) {
    error_log("ERROR: cURL error - $curlError");
    http_response_code(500);
    echo json_encode(['error' => 'cURL error: ' . $curlError]);
    exit();
}

if ($httpCode !== 200 && $httpCode !== 201) {
    error_log("ERROR: Fal.ai API returned HTTP $httpCode");
    error_log("Response: $response");

    // Try to parse the error response
    $errorDetails = 'Unknown error';
    $parsedError = json_decode($response, true);
    if ($parsedError && isset($parsedError['detail'])) {
        // If detail is an array or object, convert to JSON string for proper display
        $errorDetails = is_array($parsedError['detail']) || is_object($parsedError['detail'])
            ? json_encode($parsedError['detail'])
            : $parsedError['detail'];
    } elseif ($parsedError && isset($parsedError['error'])) {
        $errorDetails = is_array($parsedError['error']) || is_object($parsedError['error'])
            ? json_encode($parsedError['error'])
            : $parsedError['error'];
    } elseif ($parsedError && isset($parsedError['message'])) {
        $errorDetails = is_array($parsedError['message']) || is_object($parsedError['message'])
            ? json_encode($parsedError['message'])
            : $parsedError['message'];
    } else {
        $errorDetails = $response;
    }

    http_response_code($httpCode);
    echo json_encode([
        'error' => 'Fal.ai API error',
        'error_details' => $errorDetails,
        'details' => 'The fal.ai service returned an error. This may be due to API quota limits, invalid prompts, or service issues.',
        'http_code' => $httpCode,
        'raw_response' => substr($response, 0, 500)
    ]);
    exit();
}

// Parse the response
$result = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("ERROR: Invalid JSON response from Fal.ai - " . json_last_error_msg());
    http_response_code(500);
    echo json_encode([
        'error' => 'Invalid JSON response from Fal.ai',
        'json_error' => json_last_error_msg(),
        'raw_response' => substr($response, 0, 500)
    ]);
    exit();
}

error_log("API Response: " . json_encode($result));

// Extract image URL from result - handle both direct and wrapped formats
$images = null;
$description = null;

// Check if response is wrapped in "data" (SDK format)
if (isset($result['data']) && isset($result['data']['images'])) {
    $images = $result['data']['images'];
    $description = $result['data']['description'] ?? null;
}
// Check direct format
elseif (isset($result['images'])) {
    $images = $result['images'];
    $description = $result['description'] ?? null;
}

if ($images && count($images) > 0) {
    $imageUrl = $images[0]['url'] ?? null;

    if ($imageUrl) {
        error_log("SUCCESS: Image generated - " . $imageUrl);
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'image_url' => $imageUrl,
            'description' => $description,
            'request_id' => $result['request_id'] ?? $result['requestId'] ?? null
        ]);
        exit();
    }
}

// If we reach here, no valid images were found
// Check if there's an error message from fal.ai
$errorMsg = 'No images in result';

if (isset($result['error'])) {
    $errorMsg = $result['error'];
} elseif (isset($result['detail'])) {
    $errorMsg = $result['detail'];
} elseif (isset($result['message'])) {
    $errorMsg = $result['message'];
}

error_log("ERROR: " . $errorMsg);
error_log("Full response: " . json_encode($result));

http_response_code(500);
echo json_encode([
    'error' => $errorMsg,
    'details' => 'The fal.ai API did not return image data. This may be due to API quota limits, invalid prompts, or temporary service issues.',
    'full_response' => $result
]);
exit();
