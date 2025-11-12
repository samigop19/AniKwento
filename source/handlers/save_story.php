<?php



error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', '0');



set_time_limit(300); 


ini_set('memory_limit', '512M');


ob_start();


@session_start();


header('Content-Type: application/json');

require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/db_connection.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/r2_storage.php';


if (isset($db_error)) {
    ob_end_clean(); 
    echo json_encode([
        'success' => false,
        'error' => 'Database connection failed: ' . $db_error
    ]);
    exit;
}


if (!isset($_SESSION['user_id'])) {
    ob_end_clean(); 
    echo json_encode([
        'success' => false,
        'error' => 'User not authenticated'
    ]);
    exit;
}

$userId = $_SESSION['user_id'];


$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['storyData'])) {
    ob_end_clean(); 
    echo json_encode([
        'success' => false,
        'error' => 'Invalid request data'
    ]);
    exit;
}

$storyData = $data['storyData'];
$audioFiles = $data['audioFiles'] ?? [];
$visemeData = $data['visemeData'] ?? [];


if (!isset($storyData['music']) || !isset($storyData['music']['file']) || empty($storyData['music']['file'])) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'error' => 'Background music is required. Please select music before saving your story.'
    ]);
    exit;
}


try {
    $r2 = new R2Storage();
} catch (Exception $e) {
    ob_end_clean(); 
    echo json_encode([
        'success' => false,
        'error' => 'Failed to initialize R2 storage: ' . $e->getMessage()
    ]);
    exit;
}



ignore_user_abort(true);


$conn->begin_transaction();

try {
    
    
    
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

    
    $title = $storyData['title'];
    $theme = $storyData['theme'] ?? null;
    $totalScenes = $storyData['totalScenes'];
    $thumbnailUrl = $storyData['thumbnailUrl'] ?? null;
    $contextImageUrl = $storyData['contextImageUrl'] ?? null;
    $selectedVoice = $storyData['selectedVoice'] ?? null;
    $voiceId = $storyData['voiceId'] ?? null;
    $voiceNameForTTS = $storyData['voiceNameForTTS'] ?? $storyData['selectedVoice'] ?? null;
    $avatarUrl = $storyData['avatarUrl'] ?? null;
    
    error_log("🎵 Music data received: " . json_encode($storyData['music'] ?? 'NOT SET'));

    $musicName = $storyData['music']['name'] ?? null;
    $musicFile = $storyData['music']['file'] ?? null;
    
    
    $rawVolume = $storyData['music']['volume'] ?? 0.5;
    $musicVolume = ($rawVolume > 1) ? ($rawVolume / 100) : $rawVolume;

    
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

    
    
    
    $sceneStmt = $conn->prepare("
        INSERT INTO story_scenes (
            story_id, scene_number, narration, narration_lines,
            characters, visual_description, image_url, scene_prompt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    
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

        
        $sceneIds[$sceneNumber] = $sceneId;

        
        
        
        if (isset($scene['gamification']) && $scene['gamification']['hasQuestion']) {
            $gamification = $scene['gamification'];

            $gamificationStmt = $conn->prepare("
                INSERT INTO story_gamification (
                    story_id, scene_id, question_type, question, choices, correct_answer
                ) VALUES (?, ?, 'during', ?, ?, ?)
            ");

            $choices = json_encode($gamification['choices']);
            $question = $gamification['question'];
            
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

    
    
    
    if (isset($storyData['afterStoryQuestions']) && !empty($storyData['afterStoryQuestions'])) {
        $afterQuestionStmt = $conn->prepare("
            INSERT INTO story_gamification (
                story_id, scene_id, question_type, question, choices, correct_answer
            ) VALUES (?, NULL, 'after', ?, ?, ?)
        ");

        foreach ($storyData['afterStoryQuestions'] as $index => $questionData) {
            $questionText = $questionData['question'];
            $choices = json_encode($questionData['choices']);
            
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

    
    
    
    $conn->commit();

    
    
    
    ob_end_clean(); 

    
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

    
    header("Content-Length: " . strlen($response));
    header("Connection: close");
    echo $response;

    
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        ob_end_flush();
        flush();
    }

    
    @ob_end_clean();

    
    ob_start();

    
    
    
    $audioUploadResults = [];

    foreach ($storyData['scenes'] as $scene) {
        $sceneNumber = $scene['number'];
        $sceneId = $sceneIds[$sceneNumber];

        
        $audioStmt = $conn->prepare("
            INSERT INTO story_scene_audio (
                scene_id, line_number, audio_path, audio_url, audio_text, file_size, viseme_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($scene['narrationLines'] as $lineIndex => $lineText) {
            $lineNumber = $lineIndex + 1; 
            $audioKey = "scene_{$sceneNumber}_line_{$lineNumber}";

            if (!isset($audioFiles[$audioKey])) {
                error_log("Warning: Audio file missing for $audioKey");
                continue;
            }

            try {
                
                $r2Path = "audio/story_{$storyId}/scene_{$sceneNumber}_line_{$lineNumber}.mp3";
                $uploadResult = $r2->uploadAudio($audioFiles[$audioKey], $r2Path);

                if (!$uploadResult['success']) {
                    error_log("R2 Upload failed for $audioKey: " . $uploadResult['error']);
                    continue; 
                }

                $audioUploadResults[] = [
                    'key' => $audioKey,
                    'url' => $uploadResult['url'],
                    'size' => $uploadResult['size']
                ];

                
                $visemeJson = null;
                if (isset($visemeData[$audioKey]) && !empty($visemeData[$audioKey])) {
                    $visemeJson = json_encode($visemeData[$audioKey]);
                    error_log("Saving viseme data for $audioKey: " . strlen($visemeJson) . " bytes");
                }

                
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
                
            }
        }

        $audioStmt->close();
    }

    
    
    
    $updateStmt = $conn->prepare("UPDATE stories SET status = 'complete' WHERE id = ?");
    $updateStmt->bind_param("i", $storyId);
    $updateStmt->execute();
    $updateStmt->close();

    error_log("Story $storyId: All audio files uploaded successfully (" . count($audioUploadResults) . " files)");

    
    $conn->close();

    
    @ob_end_clean();
    exit(0);

} catch (Exception $e) {
    
    $conn->rollback();

    error_log("Save Story Error: " . $e->getMessage());

    ob_end_clean(); 
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit;
}