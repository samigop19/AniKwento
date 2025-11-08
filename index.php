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

// Default to home page
if (empty($requestPath) || $requestPath === 'index.php') {
    require_once __DIR__ . '/source/pages/home.html';
    exit;
}

// Route to source/pages or public files
if (file_exists(__DIR__ . '/' . $requestPath)) {
    // Check if it's a PHP file in source/
    if (strpos($requestPath, 'source/') === 0 && pathinfo($requestPath, PATHINFO_EXTENSION) === 'php') {
        require_once __DIR__ . '/' . $requestPath;
        exit;
    }

    // For static files (CSS, JS, images)
    if (strpos($requestPath, 'public/') === 0) {
        return false; // Let PHP built-in server handle it
    }
}

// Route common paths
switch (true) {
    case $requestPath === '':
    case $requestPath === 'home':
    case $requestPath === 'index':
        require_once __DIR__ . '/source/pages/home.html';
        break;

    case strpos($requestPath, 'login') !== false:
        require_once __DIR__ . '/source/pages/auth/Login.php';
        break;

    case strpos($requestPath, 'register') !== false:
        require_once __DIR__ . '/source/pages/auth/Register.php';
        break;

    case strpos($requestPath, 'dashboard') !== false:
        require_once __DIR__ . '/source/pages/dashboard/StoryDashboard.php';
        break;

    default:
        // Try to serve the file directly
        if (file_exists(__DIR__ . '/' . $requestPath)) {
            return false; // Let PHP built-in server handle it
        }

        // 404 - Not Found
        http_response_code(404);
        echo "404 - Page not found";
        break;
}
