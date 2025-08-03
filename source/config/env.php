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

        if (!file_exists($envFile)) {
            throw new Exception('.env file not found. Please copy .env.example to .env and configure your settings.');
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