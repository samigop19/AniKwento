<?php
/**
 * Delete Story Handler - AniKwento
 * Deletes a story and all associated assets from database and Cloudflare R2
 *
 * POST Request Expected Format:
 * {
 *   "story_id": 123
 * }
 *
 * Response Format:
 * {
 *   "success": true,
 *   "message": "Story deleted successfully",
 *   "deleted": {
 *     "story_id": 123,
 *     "audio_files_deleted": 30,
 *     "database_records": 45
 *   }
 * }
 */

header('Content-Type: application/json');

// Start session to get user_id
session_start();

require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/db_connection.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/r2_storage.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
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

if (!$data || !isset($data['story_id'])) {
    echo json_encode([
        'success' => false,
        'error' => 'story_id is required'
    ]);
    exit;
}

$storyId = intval($data['story_id']);

try {
    // ============================================
    // 1. Verify story ownership
    // ============================================
    $verifyQuery = "SELECT id FROM stories WHERE id = ? AND user_id = ?";
    $stmt = $conn->prepare($verifyQuery);
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
    $stmt->close();

    // ============================================
    // 2. Delete audio files from R2
    // ============================================
    $r2 = new R2Storage();
    $audioFilesDeleted = $r2->deleteStoryAudio($storyId);

    // ============================================
    // 3. Count database records before deletion (for reporting)
    // ============================================
    $counts = [];

    // Count scenes
    $countQuery = "SELECT COUNT(*) as count FROM story_scenes WHERE story_id = ?";
    $stmt = $conn->prepare($countQuery);
    $stmt->bind_param("i", $storyId);
    $stmt->execute();
    $result = $stmt->get_result();
    $counts['scenes'] = $result->fetch_assoc()['count'];
    $stmt->close();

    // Count audio records
    $countQuery = "
        SELECT COUNT(*) as count
        FROM story_scene_audio ssa
        JOIN story_scenes ss ON ssa.scene_id = ss.id
        WHERE ss.story_id = ?
    ";
    $stmt = $conn->prepare($countQuery);
    $stmt->bind_param("i", $storyId);
    $stmt->execute();
    $result = $stmt->get_result();
    $counts['audio_records'] = $result->fetch_assoc()['count'];
    $stmt->close();

    // Count gamification questions
    $countQuery = "SELECT COUNT(*) as count FROM story_gamification WHERE story_id = ?";
    $stmt = $conn->prepare($countQuery);
    $stmt->bind_param("i", $storyId);
    $stmt->execute();
    $result = $stmt->get_result();
    $counts['questions'] = $result->fetch_assoc()['count'];
    $stmt->close();

    // ============================================
    // 4. Delete story from database
    // ============================================
    // Foreign key cascades will automatically delete:
    // - story_scenes
    // - story_scene_audio (via scene cascade)
    // - story_gamification

    $deleteQuery = "DELETE FROM stories WHERE id = ? AND user_id = ?";
    $stmt = $conn->prepare($deleteQuery);
    $stmt->bind_param("ii", $storyId, $userId);

    if (!$stmt->execute()) {
        throw new Exception("Failed to delete story: " . $stmt->error);
    }

    $stmt->close();
    $conn->close();

    // ============================================
    // 5. Return success response
    // ============================================
    $totalRecords = 1 + $counts['scenes'] + $counts['audio_records'] +
                    $counts['questions'];

    echo json_encode([
        'success' => true,
        'message' => 'Story deleted successfully',
        'deleted' => [
            'story_id' => $storyId,
            'audio_files_deleted' => $audioFilesDeleted,
            'database_records' => $totalRecords,
            'details' => $counts
        ]
    ]);

} catch (Exception $e) {
    error_log("Delete Story Error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
