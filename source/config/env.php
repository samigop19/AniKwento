<?php
/**
 * Environment Configuration Loader
 * Loads environment variables from .env file
 */

class EnvLoader {
    private static $loaded = false;
    private static $config = [];

    public static function load($envFile = null) {
        if (self::$loaded) {
            return;
        }

        if ($envFile === null) {
            $envFile = dirname(dirname(__DIR__)) . '/.env';
        }

        // Check if running on Railway or similar platform (environment variables already set)
        // If .env file doesn't exist, try to use system environment variables
        if (!file_exists($envFile)) {
            // Load from system environment variables (for Railway, Docker, etc.)
            foreach ($_ENV as $key => $value) {
                self::$config[$key] = $value;
            }

            // Also check getenv() for additional variables
            $envVars = [
                'DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME',
                'SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_ENCRYPTION',
                'APP_NAME', 'APP_ENV', 'APP_DEBUG',
                'ELEVENLABS_API_KEY', 'FAL_API_KEY',
                'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_ENDPOINT', 'R2_BUCKET', 'R2_PUBLIC_URL', 'R2_REGION',
                // Railway MySQL variables
                'MYSQLHOST', 'MYSQLPORT', 'MYSQLUSER', 'MYSQLPASSWORD', 'MYSQLDATABASE'
            ];

            foreach ($envVars as $key) {
                $value = getenv($key);
                if ($value !== false) {
                    self::$config[$key] = $value;
                    $_ENV[$key] = $value;
                }
            }

            self::$loaded = true;
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse key=value pairs
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                // Remove quotes if present
                if ((substr($value, 0, 1) == '"' && substr($value, -1) == '"') ||
                    (substr($value, 0, 1) == "'" && substr($value, -1) == "'")) {
                    $value = substr($value, 1, -1);
                }

                self::$config[$key] = $value;
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }

        self::$loaded = true;
    }

    public static function get($key, $default = null) {
        self::load();
        return isset(self::$config[$key]) ? self::$config[$key] : $default;
    }
}

// Auto-load environment variables
EnvLoader::load();
?>