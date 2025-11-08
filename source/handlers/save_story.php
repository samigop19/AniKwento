<?php
/**
 * Save Story Handler - AniKwento
 * Saves a complete generated story to database and uploads audio to Cloudflare R2
 *
 * IMPLEMENTATION NOTES:
 * - Uses "early response" pattern to prevent FastCGI timeouts
 * - Saves story metadata immediately and returns success response (~2-3s)
 * - Continues audio uploads in background after client receives response
 * - Story status: 'uploading' → 'complete' (after all audio files uploaded)
 *
 * POST Request Expected Format:
 * {
 *   "storyData": {
 *     "title": "Story Title",
 *     "theme": "Educational",
 *     "totalScenes": 10,
 *     "thumbnailUrl": "https://...",
 *     "contextImageUrl": "https://...",
 *     "selectedVoice": "Rachel",
 *     "voiceId": "21m00Tcm4TlvDq8ikWAM",
 *     "music": { "name": "...", "file": "...", "volume": 0.5 },
 *     "gamificationEnabled": true,
 *     "questionTiming": "during",
 *     "scenes": [...],
 *     "afterStoryQuestions": [...]
 *   },
 *   "audioFiles": {
 *     "scene_1_line_1": "base64_audio_data",
 *     "scene_1_line_2": "base64_audio_data",
 *     ...
 *   },
 *   "visemeData": {
 *     "scene_1_line_1": [...],
 *     ...
 *   }
 * }
 *
 * Response Format:
 * {
 *   "success": true,
 *   "story_id": 123,
 *   "message": "Story saved successfully. Audio files are being uploaded in the background.",
 *   "details": {
 *     "scenes_saved": 10,
 *     "audio_files_total": 60,
 *     "upload_status": "processing"
 *   }
 * }
 */

// Suppress any warnings/errors that could break JSON response
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', '0');

// Increase execution time limit for uploading multiple audio files
// With 60 audio files to upload, we need more time than the default 30 seconds
set_time_limit(300); // 5 minutes should be sufficient

// Increase memory limit to handle large audio file uploads
ini_set('memory_limit', '512M');

// Start output buffering to catch any unwanted output
ob_start();

// Start session
@session_start();

// Set JSON header
header('Content-Type: application/json');

require_once 'db_connection.php';
require_once 'r2_storage.php';

// Check for database connection error
if (isset($db_error)) {
    ob_end_clean(); // Clear and stop output buffering
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $db_error
    ]);
    exit;
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    ob_end_clean(); // Clear and stop output buffering
    echo json_encode([
        'success' => false,
        'error' => 'User not authenticated'
    ]);
    exit;
}

$userId = $_SESSION['user_id'];

// Get POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['storyData'])) {
    ob_end_clean(); // Clear and stop output buffering
    echo json_encode([
        'success' => false,
        'error' => 'Invalid request data'
    ]);
    exit;
}

$storyData = $data['storyData'];
$audioFiles = $data['audioFiles'] ?? [];
$visemeData = $data['visemeData'] ?? [];

// Validate that music is provided
if (!isset($storyData['music']) || !isset($storyData['music']['file']) || empty($storyData['music']['file'])) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'error' => 'Background music is required. Please select music before saving your story.'
    ]);
    exit;
}

// Initialize R2 Storage
try {
    $r2 = new R2Storage();
} catch (Exception $e) {
    ob_end_clean(); // Clear and stop output buffering
    echo json_encode([
        'success' => false,
        'error' => 'Failed to initialize R2 storage: ' . $e->getMessage()
    ]);
    exit;
}

// Send success response immediately to prevent timeout
// The uploads will continue in the background
ignore_user_abort(true);

// Start database transaction
$conn->begin_transaction();

try {
    // ============================================
    // 1. Insert main story record
    // ============================================
    $stmt = $conn->prepare("
        INSERT INTO stories (
            user_id, title, theme, total_scenes,
            thumbnail_url, context_image_url,
            selected_voice, voice_id, voice_name_for_tts,
            avatar_url,
            music_name, music_file, music_volume,
            gamification_enabled, question_timing, question_types, total_questions,
            character_prompt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploading')
    ");

    // Extract all values to variables first (required for bind_param reference passing)
    $title = $storyData['title'];
    $theme = $storyData['theme'] ?? null;
    $totalScenes = $storyData['totalScenes'];
    $thumbnailUrl = $storyData['thumbnailUrl'] ?? null;
    $contextImageUrl = $storyData['contextImageUrl'] ?? null;
    $selectedVoice = $storyData['selectedVoice'] ?? null;
    $voiceId = $storyData['voiceId'] ?? null;
    $voiceNameForTTS = $storyData['voiceNameForTTS'] ?? $storyData['selectedVoice'] ?? null;
    $avatarUrl = $storyData['avatarUrl'] ?? null;
    // Debug: Log music data received from frontend
    error_log("🎵 Music data received: " . json_encode($storyData['music'] ?? 'NOT SET'));

    $musicName = $storyData['music']['name'] ?? null;
    $musicFile = $storyData['music']['file'] ?? null;
    // Convert volume from 0-1 scale to database format (0-1)
    // If volume is already in 0-1 range, keep it; if it's 0-100, convert it
    $rawVolume = $storyData['music']['volume'] ?? 0.5;
    $musicVolume = ($rawVolume > 1) ? ($rawVolume / 100) : $rawVolume;

    // Debug: Log extracted music values
    error_log("🎵 Extracted music values - Name: " . ($musicName ?? 'NULL') . ", File: " . ($musicFile ?? 'NULL') . ", Volume: " . $musicVolume);
    $gamificationEnabled = ($storyData['gamificationEnabled'] ?? false) ? 1 : 0;
    $questionTiming = $storyData['questionTiming'] ?? 'none';
    $questionTypes = isset($storyData['selectedQuestionTypes']) ? json_encode($storyData['selectedQuestionTypes']) : null;
    $totalQuestions = $storyData['totalQuestions'] ?? 0;
    $characterPrompt = $storyData['characterPrompt'] ?? null;

    $stmt->bind_param("ississssssssdissis",
        $userId,
        $title,
        $theme,
        $totalScenes,
        $thumbnailUrl,
        $contextImageUrl,
        $selectedVoice,
        $voiceId,
        $voiceNameForTTS,
        $avatarUrl,
        $musicName,
        $musicFile,
        $musicVolume,
        $gamificationEnabled,
        $questionTiming,
        $questionTypes,
        $totalQuestions,
        $characterPrompt
    );

    if (!$stmt->execute()) {
        throw new Exception("Failed to insert story: " . $stmt->error);
    }

    $storyId = $conn->insert_id;
    $stmt->close();

    // ============================================
    // 2. Insert story scenes (without audio first)
    // ============================================
    $sceneStmt = $conn->prepare("
        INSERT INTO story_scenes (
            story_id, scene_number, narration, narration_lines,
            characters, visual_description, image_url, scene_prompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // Store scene IDs for later audio upload
    $sceneIds = [];

    foreach ($storyData['scenes'] as $scene) {
        $sceneNumber = $scene['number'];
        $narration = $scene['narration'];
        $narrationLines = json_encode($scene['narrationLines']);
        $characters = isset($scene['characters']) ? json_encode($scene['characters']) : null;
        $visualDescription = $scene['visualDescription'] ?? null;
        $imageUrl = $scene['imageUrl'] ?? null;
        $scenePrompt = $scene['scenePrompt'] ?? null;

        $sceneStmt->bind_param("iissssss",
            $storyId,
            $sceneNumber,
            $narration,
            $narrationLines,
            $characters,
            $visualDescription,
            $imageUrl,
            $scenePrompt
        );

        if (!$sceneStmt->execute()) {
            throw new Exception("Failed to insert scene $sceneNumber: " . $sceneStmt->error);
        }

        $sceneId = $conn->insert_id;

        // Store scene ID for later audio upload
        $sceneIds[$sceneNumber] = $sceneId;

        // ============================================
        // 4. Insert gamification questions for this scene (if any)
        // ============================================
        if (isset($scene['gamification']) && $scene['gamification']['hasQuestion']) {
            $gamification = $scene['gamification'];

            $gamificationStmt = $conn->prepare("
                INSERT INTO story_gamification (
                    story_id, scene_id, question_type, question, choices, correct_answer
                ) VALUES (?, ?, 'during', ?, ?, ?)
            ");

            $choices = json_encode($gamification['choices']);
            $question = $gamification['question'];
            // Convert correctAnswer object to JSON string for database storage
            $correctAnswer = json_encode($gamification['correctAnswer']);

            $gamificationStmt->bind_param("iisss",
                $storyId,
                $sceneId,
                $question,
                $choices,
                $correctAnswer
            );

            if (!$gamificationStmt->execute()) {
                throw new Exception("Failed to insert gamification question: " . $gamificationStmt->error);
            }

            $gamificationStmt->close();
        }
    }

    $sceneStmt->close();

    // ============================================
    // 3. Insert after-story questions (if any)
    // ============================================
    if (isset($storyData['afterStoryQuestions']) && !empty($storyData['afterStoryQuestions'])) {
        $afterQuestionStmt = $conn->prepare("
            INSERT INTO story_gamification (
                story_id, scene_id, question_type, question, choices, correct_answer
            ) VALUES (?, NULL, 'after', ?, ?, ?)
        ");

        foreach ($storyData['afterStoryQuestions'] as $index => $questionData) {
            $questionText = $questionData['question'];
            $choices = json_encode($questionData['choices']);
            // Convert correctAnswer object to JSON string for database storage
            $correctAnswer = json_encode($questionData['correctAnswer']);

            $afterQuestionStmt->bind_param("isss",
                $storyId,
                $questionText,
                $choices,
                $correctAnswer
            );

            if (!$afterQuestionStmt->execute()) {
                throw new Exception("Failed to insert after-story question: " . $afterQuestionStmt->error);
            }
        }

        $afterQuestionStmt->close();
    }

    // ============================================
    // 4. Commit initial transaction (story metadata is saved)
    // ============================================
    $conn->commit();

    // ============================================
    // 5. Send success response IMMEDIATELY to prevent FastCGI timeout
    // ============================================
    ob_end_clean(); // Clear any buffered output

    // Prepare the JSON response
    $response = json_encode([
        'success' => true,
        'story_id' => $storyId,
        'message' => 'Story saved successfully. Audio files are being uploaded in the background.',
        'details' => [
            'scenes_saved' => count($storyData['scenes']),
            'audio_files_total' => count($audioFiles),
            'upload_status' => 'processing'
        ]
    ]);

    // Send response with Content-Length header to properly close the connection
    header("Content-Length: " . strlen($response));
    header("Connection: close");
    echo $response;

    // Flush and close the connection
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        ob_end_flush();
        flush();
    }

    // Close the connection to the client
    @ob_end_clean();

    // Prevent any further output from appearing in response
    ob_start();

    // ============================================
    // 6. Continue uploading audio files in background
    // ============================================
    $audioUploadResults = [];

    foreach ($storyData['scenes'] as $scene) {
        $sceneNumber = $scene['number'];
        $sceneId = $sceneIds[$sceneNumber];

        // Upload audio files to R2 and save references
        $audioStmt = $conn->prepare("
            INSERT INTO story_scene_audio (
                scene_id, line_number, audio_path, audio_url, audio_text, file_size, viseme_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($scene['narrationLines'] as $lineIndex => $lineText) {
            $lineNumber = $lineIndex + 1; // 1-based index
            $audioKey = "scene_{$sceneNumber}_line_{$lineNumber}";

            if (!isset($audioFiles[$audioKey])) {
                error_log("Warning: Audio file missing for $audioKey");
                continue;
            }

            try {
                // Upload to R2
                $r2Path = "audio/story_{$storyId}/scene_{$sceneNumber}_line_{$lineNumber}.mp3";
                $uploadResult = $r2->uploadAudio($audioFiles[$audioKey], $r2Path);

                if (!$uploadResult['success']) {
                    error_log("R2 Upload failed for $audioKey: " . $uploadResult['error']);
                    continue; // Skip this audio file but continue with others
                }

                $audioUploadResults[] = [
                    'key' => $audioKey,
                    'url' => $uploadResult['url'],
                    'size' => $uploadResult['size']
                ];

                // Get viseme data for this line (if available)
                $visemeJson = null;
                if (isset($visemeData[$audioKey]) && !empty($visemeData[$audioKey])) {
                    $visemeJson = json_encode($visemeData[$audioKey]);
                    error_log("Saving viseme data for $audioKey: " . strlen($visemeJson) . " bytes");
                }

                // Save audio reference to database with viseme data
                $audioStmt->bind_param("iisssis",
                    $sceneId,
                    $lineNumber,
                    $r2Path,
                    $uploadResult['url'],
                    $lineText,
                    $uploadResult['size'],
                    $visemeJson
                );

                if (!$audioStmt->execute()) {
                    error_log("Failed to insert audio record for $audioKey: " . $audioStmt->error);
                }
            } catch (Exception $audioError) {
                error_log("Error processing audio $audioKey: " . $audioError->getMessage());
                // Continue with next audio file
            }
        }

        $audioStmt->close();
    }

    // ============================================
    // 7. Update story status to 'complete' after all uploads
    // ============================================
    $updateStmt = $conn->prepare("UPDATE stories SET status = 'complete' WHERE id = ?");
    $updateStmt->bind_param("i", $storyId);
    $updateStmt->execute();
    $updateStmt->close();

    error_log("Story $storyId: All audio files uploaded successfully (" . count($audioUploadResults) . " files)");

    // Close database connection
    $conn->close();

    // Clean up output buffer and exit cleanly
    @ob_end_clean();
    exit(0);

} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();

    error_log("Save Story Error: " . $e->getMessage());

    ob_end_clean(); // Clear and stop output buffering
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit;
}