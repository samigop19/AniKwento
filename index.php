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

// Route common paths first
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
        require_once __DIR__ . '/source/pages/auth/Register.php';
        exit;

    case stripos($requestPath, 'dashboard') !== false:
        require_once __DIR__ . '/source/pages/dashboard/StoryDashboard.php';
        exit;
}

// Try to serve files directly (for source/ and public/ paths)
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

    // For other existing files
    return false;
}

// 404 - Not Found
http_response_code(404);
echo "404 - Page not found: " . htmlspecialchars($requestPath);
