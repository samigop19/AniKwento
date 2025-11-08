<?php
/**
 * Test Script for Settings Dashboard
 * This script tests if settings can be loaded and saved correctly
 */

// Start session and set test user
session_start();

// For testing, we'll use user_id = 1 (make sure you have a user with ID 1)
$_SESSION['user_id'] = 1;

echo "=== Settings Dashboard Test ===\n\n";

// Test 1: Load settings
echo "Test 1: Loading settings...\n";
echo str_repeat("-", 80) . "\n";

$ch = curl_init('http://localhost/AniKwento/source/handlers/get_settings.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, 'PHPSESSID=' . session_id());
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200) {
    $data = json_decode($response, true);
    if ($data && isset($data['success']) && $data['success']) {
        echo "✓ Settings loaded successfully!\n";
        echo "\nCurrent settings:\n";
        foreach ($data['settings'] as $key => $value) {
            if (is_null($value)) {
                echo "  - $key: NULL\n";
            } else if (is_array($value) || is_object($value)) {
                echo "  - $key: " . json_encode($value) . "\n";
            } else {
                echo "  - $key: $value\n";
            }
        }
        if (isset($data['is_default']) && $data['is_default']) {
            echo "\n(Using default values - no user settings found)\n";
        }
    } else {
        echo "✗ Failed to load settings\n";
        echo "Response: $response\n";
    }
} else {
    echo "✗ HTTP Error: $httpCode\n";
}

echo "\n" . str_repeat("=", 80) . "\n\n";

// Test 2: Save settings
echo "Test 2: Saving test settings...\n";
echo str_repeat("-", 80) . "\n";

$testSettings = [
    'voice_mode' => 'Lily',
    'narration_volume' => 0.85,
    'background_music' => 'gentle',
    'music_volume' => 0.60,
    'question_timing' => 'both',
    'question_types' => json_encode(['colorRecognition', 'emotions'])
];

$ch = curl_init('http://localhost/AniKwento/source/handlers/save_settings.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($testSettings));
curl_setopt($ch, CURLOPT_COOKIE, 'PHPSESSID=' . session_id());
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200) {
    $data = json_decode($response, true);
    if ($data && isset($data['success']) && $data['success']) {
        echo "✓ Settings saved successfully!\n";
        echo "\nSaved settings:\n";
        foreach ($testSettings as $key => $value) {
            echo "  - $key: $value\n";
        }
    } else {
        echo "✗ Failed to save settings\n";
        echo "Response: $response\n";
    }
} else {
    echo "✗ HTTP Error: $httpCode\n";
}

echo "\n" . str_repeat("=", 80) . "\n\n";

// Test 3: Verify saved settings were persisted
echo "Test 3: Verifying saved settings were persisted...\n";
echo str_repeat("-", 80) . "\n";

$ch = curl_init('http://localhost/AniKwento/source/handlers/get_settings.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, 'PHPSESSID=' . session_id());
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200) {
    $data = json_decode($response, true);
    if ($data && isset($data['success']) && $data['success']) {
        $allMatch = true;
        foreach ($testSettings as $key => $value) {
            $expected = $value;
            $actual = $data['settings'][$key];

            // Convert numeric values for comparison
            if ($key === 'narration_volume' || $key === 'music_volume') {
                $expected = floatval($expected);
                $actual = floatval($actual);
            }

            if ($expected != $actual) {
                echo "✗ Mismatch for $key: expected '$expected', got '$actual'\n";
                $allMatch = false;
            }
        }

        if ($allMatch) {
            echo "✓ All settings match! Database persistence is working correctly.\n";
        } else {
            echo "✗ Some settings don't match\n";
        }
    } else {
        echo "✗ Failed to load settings for verification\n";
    }
} else {
    echo "✗ HTTP Error: $httpCode\n";
}

echo "\n" . str_repeat("=", 80) . "\n";
echo "Test completed!\n";
echo str_repeat("=", 80) . "\n";
