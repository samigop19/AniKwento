<?php



ob_start();


session_start();


header('Content-Type: application/json');

require_once $_SERVER['DOCUMENT_ROOT'] . '/source/handlers/db_connection.php';


if (!isset($_SESSION['user_id'])) {
    ob_clean(); 
    echo json_encode([
        'success' => false,
        'error' => 'User not authenticated'
    ]);
    exit;
}

$userId = $_SESSION['user_id'];


$status = $_GET['status'] ?? null;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
$sort = $_GET['sort'] ?? 'created_desc';


if ($limit < 1 || $limit > 100) {
    $limit = 20;
}


$whereClause = "WHERE s.user_id = ?";
$params = [$userId];
$types = "i";

if ($status && in_array($status, ['complete', 'draft', 'archived'])) {
    $whereClause .= " AND s.status = ?";
    $params[] = $status;
    $types .= "s";
}


$orderByClause = match($sort) {
    'created_asc' => 'ORDER BY s.created_at ASC',
    'title_asc' => 'ORDER BY s.title ASC',
    default => 'ORDER BY s.created_at DESC'
};

try {
    
    
    
    $countQuery = "SELECT COUNT(*) as total FROM stories s $whereClause";
    $stmt = $conn->prepare($countQuery);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalRow = $result->fetch_assoc();
    $total = $totalRow['total'];
    $stmt->close();

    
    
    
    $query = "
        SELECT
            s.id,
            s.title,
            s.theme,
            s.total_scenes,
            s.thumbnail_url,
            s.selected_voice,
            cv.voice_name as custom_voice_name,
            s.gamification_enabled,
            s.status,
            s.created_at,
            s.updated_at,
            (SELECT COUNT(*) FROM story_gamification WHERE story_id = s.id) as question_count
        FROM stories s
        LEFT JOIN custom_voices cv ON s.selected_voice = cv.voice_key
        $whereClause
        $orderByClause
        LIMIT ? OFFSET ?
    ";

    $stmt = $conn->prepare($query);
    $params[] = $limit;
    $params[] = $offset;
    $types .= "ii";
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $stories = [];
    while ($row = $result->fetch_assoc()) {
        
        $displayVoice = $row['custom_voice_name'] ?? $row['selected_voice'];

        $stories[] = [
            'id' => intval($row['id']),
            'title' => $row['title'],
            'theme' => $row['theme'],
            'total_scenes' => intval($row['total_scenes']),
            'thumbnail_url' => $row['thumbnail_url'],
            'selected_voice' => $displayVoice,
            'has_gamification' => boolval($row['gamification_enabled']),
            'question_count' => intval($row['question_count']),
            'status' => $row['status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];
    }

    $stmt->close();
    $conn->close();

    ob_clean(); 
    echo json_encode([
        'success' => true,
        'stories' => $stories,
        'total' => intval($total),
        'limit' => $limit,
        'offset' => $offset,
        'has_more' => ($offset + $limit) < $total
    ]);

} catch (Exception $e) {
    error_log("Get User Stories Error: " . $e->getMessage());

    ob_clean(); 
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
