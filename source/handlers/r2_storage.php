<?php
/**
 * Cloudflare R2 Storage Helper for AniKwento
 * Works on both localhost and production!
 */

// Load AWS SDK
require_once __DIR__ . '/../../vendor/autoload.php';

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class R2Storage {
    private $s3Client;
    private $bucketName;
    private $publicUrl;
    private $config;

    public function __construct() {
        // Load configuration
        $configFile = __DIR__ . '/r2_config.php';

        if (!file_exists($configFile)) {
            throw new Exception("R2 configuration file not found. Please create r2_config.php");
        }

        $this->config = require $configFile;

        // Validate required config keys
        $requiredKeys = ['access_key', 'secret_key', 'endpoint', 'bucket', 'public_url', 'region'];
        foreach ($requiredKeys as $key) {
            if (!isset($this->config[$key]) || empty($this->config[$key])) {
                throw new Exception("Missing required R2 config: $key");
            }
        }

        $this->bucketName = $this->config['bucket'];
        $this->publicUrl = rtrim($this->config['public_url'], '/');

        // Initialize S3 client (R2 is S3-compatible)
        $this->s3Client = new S3Client([
            'version' => 'latest',
            'region' => $this->config['region'],
            'endpoint' => $this->config['endpoint'],
            'credentials' => [
                'key'    => $this->config['access_key'],
                'secret' => $this->config['secret_key'],
            ],
            'use_path_style_endpoint' => true,
        ]);
    }

    /**
     * Upload audio file from base64 data
     * @param string $base64Audio - Base64 encoded audio
     * @param string $filePath - Path in bucket (e.g., "audio/story_1/scene_1_line_1.mp3")
     * @return array - ['success' => true, 'url' => '...'] or ['success' => false, 'error' => '...']
     */
    public function uploadAudio($base64Audio, $filePath) {
        try {
            // Remove base64 prefix if present
            $audioData = preg_replace('/^data:audio\/\w+;base64,/', '', $base64Audio);
            $decodedAudio = base64_decode($audioData);

            if ($decodedAudio === false) {
                throw new Exception("Invalid base64 audio data");
            }

            // Upload to R2
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucketName,
                'Key'    => $filePath,
                'Body'   => $decodedAudio,
                'ContentType' => 'audio/mpeg',
                'CacheControl' => 'public, max-age=31536000', // Cache for 1 year
            ]);

            // Build public URL
            // If using proxy (ends with ?file=), don't add extra slash
            if ($this->config['use_proxy'] ?? false) {
                $publicUrl = $this->publicUrl . $filePath;
            } else {
                $publicUrl = $this->publicUrl . '/' . $filePath;
            }

            return [
                'success' => true,
                'url' => $publicUrl,
                'size' => strlen($decodedAudio)
            ];

        } catch (AwsException $e) {
            error_log("R2 Upload Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        } catch (Exception $e) {
            error_log("Upload Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Test connection to R2
     * @return bool
     */
    public function testConnection() {
        try {
            $result = $this->s3Client->headBucket([
                'Bucket' => $this->bucketName,
            ]);
            return true;
        } catch (AwsException $e) {
            error_log("R2 Connection Test Failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete file from R2
     * @param string $filePath
     * @return bool
     */
    public function deleteFile($filePath) {
        try {
            $this->s3Client->deleteObject([
                'Bucket' => $this->bucketName,
                'Key'    => $filePath,
            ]);
            return true;
        } catch (AwsException $e) {
            error_log("R2 Delete Error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete all audio files for a story
     * @param int $storyId
     * @return int - Number of files deleted
     */
    public function deleteStoryAudio($storyId) {
        try {
            $prefix = "audio/story_{$storyId}/";

            // List all files with this prefix
            $objects = $this->s3Client->listObjects([
                'Bucket' => $this->bucketName,
                'Prefix' => $prefix,
            ]);

            $deletedCount = 0;
            if (isset($objects['Contents'])) {
                foreach ($objects['Contents'] as $object) {
                    $this->deleteFile($object['Key']);
                    $deletedCount++;
                }
            }

            return $deletedCount;
        } catch (AwsException $e) {
            error_log("R2 Delete Story Error: " . $e->getMessage());
            return 0;
        }
    }
}