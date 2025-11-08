<?php
/**
 * Generate Voice Preview Files
 * Downloads preview audio for all storyteller voices
 */

// ElevenLabs API Configuration
const ELEVENLABS_API_KEY = 'REDACTED_ELEVENLABS_KEY';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech/';

// Voice configurations
$voices = [
    'Rachel' => [
        'id' => '21m00Tcm4TlvDq8ikWAM',
        'filename' => 'rachel-preview.mp3',
        'name' => 'Rachel - Calm & Gentle Storyteller'
    ],
    'Drew' => [
        'id' => 'qBDvhofpxp92JgXJxDjB',
        'filename' => 'amara-preview.mp3',
        'name' => 'Amara - Warm & Engaging Narrator'
    ],
    'Lily' => [
        'id' => 'GEcKlrQ1MWkJKoc7UTJd',
        'filename' => 'lily-preview.mp3',
        'name' => 'Lily - Friendly & Expressive Voice'
    ],
    'Rod' => [
        'id' => 'yXCvTL13fpQ4Uuqriplz',
        'filename' => 'rod-preview.mp3',
        'name' => 'Rod - Confident & Dynamic Narrator'
    ],
    'Aaron' => [
        'id' => 'BVirrGoC94ipnqfb5ewn',
        'filename' => 'aaron-preview.mp3',
        'name' => 'Aaron - Clear & Professional Voice'
    ]
];

// Preview text
$previewText = "Once upon a time, in a magical land filled with wonder, two curious children discovered an amazing adventure waiting just for them.";

// Output directory
$outputDir = __DIR__ . '/public/files/voice-previews/';

// Create directory if it doesn't exist
if (!file_exists($outputDir)) {
    mkdir($outputDir, 0755, true);
    echo "✅ Created directory: {$outputDir}\n";
}

// Voice settings
$voiceSettings = [
    'text' => $previewText,
    'model_id' => 'eleven_flash_v2_5',
    'voice_settings' => [
        'stability' => 0.33,
        'similarity_boost' => 1.0,
        'style' => 0.0,
        'use_speaker_boost' => true,
        'speed' => 0.80
    ]
];

echo "\n🎤 Generating voice previews...\n\n";

foreach ($voices as $key => $voice) {
    echo "Processing {$voice['name']}...\n";

    $apiUrl = ELEVENLABS_API_URL . $voice['id'];
    $outputFile = $outputDir . $voice['filename'];

    // Initialize cURL
    $ch = curl_init($apiUrl);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'xi-api-key: ' . ELEVENLABS_API_KEY,
            'Content-Type: application/json',
            'Accept: audio/mpeg'
        ],
        CURLOPT_POSTFIELDS => json_encode($voiceSettings),
        CURLOPT_TIMEOUT => 30,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    // Execute request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);

    curl_close($ch);

    // Handle response
    if ($error) {
        echo "  ❌ cURL error: {$error}\n";
        continue;
    }

    if ($httpCode !== 200) {
        echo "  ❌ API error (HTTP {$httpCode}): {$response}\n";
        continue;
    }

    // Save audio file
    $result = file_put_contents($outputFile, $response);

    if ($result === false) {
        echo "  ❌ Failed to save file: {$outputFile}\n";
    } else {
        $fileSize = number_format(filesize($outputFile) / 1024, 2);
        echo "  ✅ Saved: {$voice['filename']} ({$fileSize} KB)\n";
    }

    // Small delay between requests
    sleep(1);
    echo "\n";
}

echo "🎉 Voice preview generation complete!\n";
echo "📁 Files saved to: {$outputDir}\n";
