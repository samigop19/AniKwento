<?php
/**
 * Get Story Detail Handler - AniKwento
 * Retrieves complete story data for playback
 *
 * GET Request Parameters:
 * - story_id (required): The ID of the story to retrieve
 *
 * Response Format:
 * {
 *   "success": true,
 *   "story": {
 *     "id": 123,
 *     "title": "Story Title",
 *     "theme": "Educational",
 *     "total_scenes": 10,
 *     "thumbnail_url": "https://...",
 *     "context_image_url": "https://...",
 *     "selected_voice": "Rachel",
 *     "voice_id": "21m00Tcm4TlvDq8ikWAM",
 *     "avatar_url": "https://...",
 *     "music": {
 *       "name": "Playful",
 *       "file": "playful.mp3",
 *       "volume": 0.5
 *     },
 *     "gamification_enabled": true,
 *     "question_timing": "during",
 *     "scenes": [
 *       {
 *         "number": 1,
 *         "narration": "Full text...",
 *         "narration_lines": ["Line 1", "Line 2"],
 *         "characters": ["Alice", "Bob"],
 *         "visual_description": "...",
 *         "image_url": "https://...",
 *         "audio_urls": ["https://r2.../audio1.mp3", "https://r2.../audio2.mp3"],
 *         "gamification": {
 *           "has_question": true,
 *           "question": "What color?",
 *           "choices": ["Red", "Blue"],
 *           "correct_answer": "Red",
 *           "audio_url": "https://r2.../question.mp3"
 *         }
 *       }
 *     ],
 *     "after_story_questions": [...]
 *   }
 * }
 */

header('Content-Type: application/json');

// Start session to get user_id
session_start();

require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/db_connection.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'error' => 'User not authenticated'
    ]);
    exit;
}

$userId = $_SESSION['user_id'];

// Get story_id parameter
$storyId = $_GET['story_id'] ?? null;

if (!$storyId) {
    echo json_encode([
        'success' => false,
        'error' => 'story_id parameter is required'
    ]);
    exit;
}

try {
    // ============================================
    // 1. Get story metadata
    // ============================================
    $storyQuery = "
        SELECT
            s.*
        FROM stories s
        WHERE s.id = ? AND s.user_id = ?
    ";

    $stmt = $conn->prepare($storyQuery);
    $stmt->bind_param("ii", $storyId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Story not found or access denied'
        ]);
        exit;
    }

    $storyRow = $result->fetch_assoc();
    $stmt->close();

    // ============================================
    // 2. Get all scenes
    // ============================================
    $scenesQuery = "
        SELECT
            ss.*
        FROM story_scenes ss
        WHERE ss.story_id = ?
        ORDER BY ss.scene_number ASC
    ";

    $stmt = $conn->prepare($scenesQuery);
    $stmt->bind_param("i", $storyId);
    $stmt->execute();
    $scenesResult = $stmt->get_result();

    $scenes = [];
    while ($sceneRow = $scenesResult->fetch_assoc()) {
        $sceneId = $sceneRow['id'];
        $sceneNumber = $sceneRow['scene_number'];

        // ============================================
        // 3. Get audio files for this scene
        // ============================================
        $audioQuery = "
            SELECT
                line_number,
                audio_url,
                audio_text,
                file_size,
                duration,
                viseme_data
            FROM story_scene_audio
            WHERE scene_id = ?
            ORDER BY line_number ASC
        ";

        $audioStmt = $conn->prepare($audioQuery);
        $audioStmt->bind_param("i", $sceneId);
        $audioStmt->execute();
        $audioResult = $audioStmt->get_result();

        $audioUrls = [];
        $visemeDataArray = [];
        while ($audioRow = $audioResult->fetch_assoc()) {
            $audioUrls[] = $audioRow['audio_url'];

            // Decode viseme data if available
            if ($audioRow['viseme_data']) {
                $visemeDataArray[] = json_decode($audioRow['viseme_data'], true);
            } else {
                $visemeDataArray[] = null;
            }
        }
        $audioStmt->close();

        // ============================================
        // 4. Get gamification question for this scene (if any)
        // ============================================
        $gamificationQuery = "
            SELECT
                question,
                choices,
                correct_answer
            FROM story_gamification
            WHERE story_id = ? AND scene_id = ? AND question_type = 'during'
            LIMIT 1
        ";

        $gamStmt = $conn->prepare($gamificationQuery);
        $gamStmt->bind_param("ii", $storyId, $sceneId);
        $gamStmt->execute();
        $gamResult = $gamStmt->get_result();

        $gamification = null;
        if ($gamResult->num_rows > 0) {
            $gamRow = $gamResult->fetch_assoc();
            $gamification = [
                'hasQuestion' => true,
                'question' => $gamRow['question'],
                'choices' => json_decode($gamRow['choices'], true),
                // Parse correctAnswer JSON back to object
                'correctAnswer' => json_decode($gamRow['correct_answer'], true)
            ];
        } else {
            $gamification = ['hasQuestion' => false];
        }
        $gamStmt->close();

        // Build scene object
        $scenes[] = [
            'number' => intval($sceneNumber),
            'narration' => $sceneRow['narration'],
            'narrationLines' => json_decode($sceneRow['narration_lines'], true),
            'characters' => json_decode($sceneRow['characters'], true) ?? [],
            'visualDescription' => $sceneRow['visual_description'],
            'imageUrl' => $sceneRow['image_url'],
            'scenePrompt' => $sceneRow['scene_prompt'],
            'audioUrls' => $audioUrls,
            'visemeDataArray' => $visemeDataArray,
            'gamification' => $gamification
        ];
    }

    $stmt->close();

    // ============================================
    // 5. Get after-story questions
    // ============================================
    $afterQuestionsQuery = "
        SELECT
            question,
            choices,
            correct_answer
        FROM story_gamification
        WHERE story_id = ? AND scene_id IS NULL AND question_type = 'after'
        ORDER BY id ASC
    ";

    $stmt = $conn->prepare($afterQuestionsQuery);
    $stmt->bind_param("i", $storyId);
    $stmt->execute();
    $afterQuestionsResult = $stmt->get_result();

    $afterStoryQuestions = [];
    while ($afterRow = $afterQuestionsResult->fetch_assoc()) {
        $afterStoryQuestions[] = [
            'question' => $afterRow['question'],
            'choices' => json_decode($afterRow['choices'], true),
            // Parse correctAnswer JSON back to object
            'correctAnswer' => json_decode($afterRow['correct_answer'], true)
        ];
    }
    $stmt->close();

    // ============================================
    // 6. Build response
    // ============================================
    $story = [
        'id' => intval($storyRow['id']),
        'title' => $storyRow['title'],
        'theme' => $storyRow['theme'],
        'totalScenes' => intval($storyRow['total_scenes']),
        'thumbnailUrl' => $storyRow['thumbnail_url'],
        'contextImageUrl' => $storyRow['context_image_url'],
        'selectedVoice' => $storyRow['selected_voice'],
        'voiceId' => $storyRow['voice_id'],
        'voiceNameForTTS' => $storyRow['voice_name_for_tts'],
        'avatarUrl' => $storyRow['avatar_url'],
        'music' => [
            'enabled' => !empty($storyRow['music_file']),
            'name' => $storyRow['music_name'],
            'file' => $storyRow['music_file'],
            'fileName' => $storyRow['music_file'] ?: 'adventure.mp3',  // Default to adventure.mp3 if empty
            'volume' => floatval($storyRow['music_volume']) * 100  // Convert to 0-100 scale
        ],
        'gamificationEnabled' => boolval($storyRow['gamification_enabled']),
        'questionTiming' => $storyRow['question_timing'],
        'questionTypes' => json_decode($storyRow['question_types'], true),
        'totalQuestions' => intval($storyRow['total_questions']),
        'characterPrompt' => $storyRow['character_prompt'],
        'status' => $storyRow['status'],
        'createdAt' => $storyRow['created_at'],
        'scenes' => $scenes,
        'afterStoryQuestions' => $afterStoryQuestions
    ];

    $conn->close();

    echo json_encode([
        'success' => true,
        'story' => $story
    ]);

} catch (Exception $e) {
    error_log("Get Story Detail Error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
