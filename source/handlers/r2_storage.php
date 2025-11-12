<?php



require_once __DIR__ . '/../../vendor/autoload.php';

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class R2Storage {
    private $s3Client;
    private $bucketName;
    private $publicUrl;
    private $config;

    public function __construct() {
        
        
        $configFile = __DIR__ . '/r2_config.php';

        if (!file_exists($configFile)) {
            throw new Exception("R2 configuration file not found. Please create r2_config.php at " . $configFile);
        }

        $this->config = require $configFile;

        
        $requiredKeys = ['access_key', 'secret_key', 'endpoint', 'bucket', 'public_url', 'region'];
        foreach ($requiredKeys as $key) {
            if (!isset($this->config[$key]) || empty($this->config[$key])) {
                throw new Exception("Missing required R2 config: $key");
            }
        }

        $this->bucketName = $this->config['bucket'];
        $this->publicUrl = rtrim($this->config['public_url'], '/');

        
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

    
    public function uploadAudio($base64Audio, $filePath) {
        try {
            
            $audioData = preg_replace('/^data:audio\/\w+;base64,/', '', $base64Audio);
            $decodedAudio = base64_decode($audioData);

            if ($decodedAudio === false) {
                throw new Exception("Invalid base64 audio data");
            }

            
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucketName,
                'Key'    => $filePath,
                'Body'   => $decodedAudio,
                'ContentType' => 'audio/mpeg',
                'CacheControl' => 'public, max-age=31536000', 
            ]);

            
            
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

    
    public function uploadImage($tmpFilePath, $filename, $mimeType = 'image/jpeg') {
        try {
            
            $imageData = file_get_contents($tmpFilePath);

            if ($imageData === false) {
                throw new Exception("Failed to read uploaded file");
            }

            
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucketName,
                'Key'    => $filename,
                'Body'   => $imageData,
                'ContentType' => $mimeType,
                'CacheControl' => 'public, max-age=31536000', 
            ]);

            
            if ($this->config['use_proxy'] ?? false) {
                $publicUrl = $this->publicUrl . $filename;
            } else {
                $publicUrl = $this->publicUrl . '/' . $filename;
            }

            return [
                'success' => true,
                'url' => $publicUrl,
                'key' => $filename,
                'size' => strlen($imageData)
            ];

        } catch (AwsException $e) {
            error_log("R2 Image Upload Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        } catch (Exception $e) {
            error_log("Image Upload Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    
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

    
    public function deleteStoryAudio($storyId) {
        try {
            $prefix = "audio/story_{$storyId}/";

            
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