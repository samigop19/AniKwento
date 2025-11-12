<?php



$_SERVER['DOCUMENT_ROOT'] = __DIR__;

require_once __DIR__ . '/source/config/env.php';
EnvLoader::load();


$requestUri = $_SERVER['REQUEST_URI'];
$requestPath = parse_url($requestUri, PHP_URL_PATH);


$requestPath = ltrim($requestPath, '/');


if ($requestPath === 'health' || $requestPath === 'healthz') {
    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'timestamp' => time()]);
    exit;
}



$isPublicPath = strpos($requestPath, 'public/') === 0;
$isSourceStaticPath = strpos($requestPath, 'source/') === 0 && pathinfo($requestPath, PATHINFO_EXTENSION) !== 'php';

if ($isPublicPath || $isSourceStaticPath) {
    $filePath = __DIR__ . '/' . $requestPath;
    if (file_exists($filePath)) {
        
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeTypes = [
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
            'webp' => 'image/webp',
            'webm' => 'video/webm',
            'mp4' => 'video/mp4',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'eot' => 'application/vnd.ms-fontobject'
        ];

        if (isset($mimeTypes[$extension])) {
            header('Content-Type: ' . $mimeTypes[$extension]);
            header('Content-Length: ' . filesize($filePath));
            readfile($filePath);
            exit;
        }

        
        return false;
    }
}


if (strpos($requestPath, 'source/handlers/') === 0 && file_exists(__DIR__ . '/' . $requestPath)) {
    require_once __DIR__ . '/' . $requestPath;
    exit;
}


if (strpos($requestPath, 'source/') === 0 && pathinfo($requestPath, PATHINFO_EXTENSION) === 'php' && file_exists(__DIR__ . '/' . $requestPath)) {
    require_once __DIR__ . '/' . $requestPath;
    exit;
}


if (empty($requestPath) || $requestPath === 'index.php') {
    require_once __DIR__ . '/source/pages/home.html';
    exit;
}


switch (true) {
    case $requestPath === '':
    case $requestPath === 'home':
    case $requestPath === 'index':
        require_once __DIR__ . '/source/pages/home.html';
        exit;

    case stripos($requestPath, 'login') !== false:
        require_once __DIR__ . '/source/pages/auth/Login.php';
        exit;

    case stripos($requestPath, 'register') !== false:
        if (stripos($requestPath, 'verify') !== false) {
            require_once __DIR__ . '/source/pages/auth/register-verify.php';
        } else {
            require_once __DIR__ . '/source/pages/auth/Register.php';
        }
        exit;

    case stripos($requestPath, 'forgot') !== false:
    case stripos($requestPath, 'forgotpassword') !== false:
        require_once __DIR__ . '/source/pages/auth/ForgotPassword.php';
        exit;

    case stripos($requestPath, 'public_profile') !== false:
    case stripos($requestPath, 'public-profile') !== false:
        
        require_once __DIR__ . '/source/pages/dashboard/public_profile.php';
        exit;

    case stripos($requestPath, 'dashboard') !== false:
        require_once __DIR__ . '/source/pages/dashboard/StoryDashboard.php';
        exit;

    case stripos($requestPath, 'storyboard') !== false:
        require_once __DIR__ . '/source/pages/storyboard/storyboard.html';
        exit;

    case stripos($requestPath, 'afterstoryquiz') !== false:
    case stripos($requestPath, 'after-story-quiz') !== false:
        require_once __DIR__ . '/source/pages/storyboard/AfterStoryQuiz.html';
        exit;
}


if (preg_match('#^auth/(.+)\.php$#', $requestPath, $matches)) {
    $authPage = $matches[1];
    $authFilePath = __DIR__ . '/source/pages/auth/' . $authPage . '.php';
    if (file_exists($authFilePath)) {
        require_once $authFilePath;
        exit;
    }
}


if (preg_match('/^(run_|sync_|migrate_|verify_).+\.php$/', $requestPath)) {
    $migrationFile = __DIR__ . '/' . $requestPath;
    if (file_exists($migrationFile)) {
        require_once $migrationFile;
        exit;
    }
}


if ($requestPath === 'run_schema_sync.php' || $requestPath === 'sync_railway_schema.php') {
    $scriptFile = __DIR__ . '/' . $requestPath;
    if (file_exists($scriptFile)) {
        require_once $scriptFile;
        exit;
    }
}


http_response_code(404);
echo "404 - Page not found: " . htmlspecialchars($requestPath);
