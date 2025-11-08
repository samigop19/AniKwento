<?php
/**
 * AniKwento Entry Point for Railway Deployment
 * Routes requests to the appropriate page
 */

// Load environment variables
require_once __DIR__ . '/source/config/env.php';
EnvLoader::load();

// Get the request URI
$requestUri = $_SERVER['REQUEST_URI'];
$requestPath = parse_url($requestUri, PHP_URL_PATH);

// Remove leading slash
$requestPath = ltrim($requestPath, '/');

// FIRST: Check for static files (CSS, JS, images) and serve with proper MIME types
if (strpos($requestPath, 'public/') === 0) {
    $filePath = __DIR__ . '/' . $requestPath;
    if (file_exists($filePath)) {
        // Get file extension and set appropriate MIME type
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

        // For other file types, let PHP server handle it
        return false;
    }
}

// SECOND: Check for handler PHP files in source/
if (strpos($requestPath, 'source/handlers/') === 0 && file_exists(__DIR__ . '/' . $requestPath)) {
    require_once __DIR__ . '/' . $requestPath;
    exit;
}

// THIRD: Handle other source/ PHP files
if (strpos($requestPath, 'source/') === 0 && pathinfo($requestPath, PATHINFO_EXTENSION) === 'php' && file_exists(__DIR__ . '/' . $requestPath)) {
    require_once __DIR__ . '/' . $requestPath;
    exit;
}

// Default to home page
if (empty($requestPath) || $requestPath === 'index.php') {
    require_once __DIR__ . '/source/pages/home.html';
    exit;
}

// Route common paths
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

    case stripos($requestPath, 'dashboard') !== false:
        require_once __DIR__ . '/source/pages/dashboard/StoryDashboard.php';
        exit;
}

// Check if it's an auth page route
if (preg_match('#^auth/(.+)\.php$#', $requestPath, $matches)) {
    $authPage = $matches[1];
    $authFilePath = __DIR__ . '/source/pages/auth/' . $authPage . '.php';
    if (file_exists($authFilePath)) {
        require_once $authFilePath;
        exit;
    }
}

// 404 - Not Found
http_response_code(404);
echo "404 - Page not found: " . htmlspecialchars($requestPath);
