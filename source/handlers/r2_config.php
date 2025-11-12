<?php



require_once __DIR__ . '/../config/env.php';
EnvLoader::load();


$r2Config = [
    'access_key' => EnvLoader::get('R2_ACCESS_KEY'),
    'secret_key' => EnvLoader::get('R2_SECRET_KEY'),
    'endpoint' => EnvLoader::get('R2_ENDPOINT'),
    'bucket' => EnvLoader::get('R2_BUCKET'),
    'public_url' => EnvLoader::get('R2_PUBLIC_URL'),
    'region' => EnvLoader::get('R2_REGION', 'auto'),
];


$requiredKeys = ['access_key', 'secret_key', 'endpoint', 'bucket', 'public_url'];
foreach ($requiredKeys as $key) {
    if (empty($r2Config[$key])) {
        error_log("ERROR: R2 configuration incomplete - {$key} is missing");
        throw new Exception("R2 configuration incomplete: {$key} is missing");
    }
}

return $r2Config;