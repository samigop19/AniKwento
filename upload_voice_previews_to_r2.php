<?php
/**
 * Upload Voice Preview Files to Cloudflare R2
 * Run this script to upload all voice preview MP3 files to R2 storage
 */

require_once __DIR__ . '/source/handlers/r2_storage.php';

// Voice preview files to upload (only Rachel, Amara, Lily)
$voiceFiles = [
    'rachel-preview.mp3',
    'amara-preview.mp3',
    'lily-preview.mp3'
];

$localDir = __DIR__ . '/public/files/voice-previews/';
$r2Prefix = 'voice-previews/'; // Folder in R2 bucket

echo "=== Voice Preview Upload to R2 ===\n\n";

try {
    // Initialize R2 Storage
    $r2 = new R2Storage();

    // Test connection
    echo "Testing R2 connection...\n";
    if (!$r2->testConnection()) {
        throw new Exception("Failed to connect to R2. Check your credentials.");
    }
    echo "✓ Connected to R2 successfully\n\n";

    $uploadedCount = 0;
    $failedCount = 0;

    foreach ($voiceFiles as $filename) {
        $localPath = $localDir . $filename;
        $r2Path = $r2Prefix . $filename;

        echo "Uploading: {$filename}\n";
        echo "  Local: {$localPath}\n";

        // Check if file exists
        if (!file_exists($localPath)) {
            echo "  ✗ File not found!\n\n";
            $failedCount++;
            continue;
        }

        // Get file size
        $fileSize = filesize($localPath);
        echo "  Size: " . number_format($fileSize / 1024, 2) . " KB\n";

        // Read file content
        $fileContent = file_get_contents($localPath);
        if ($fileContent === false) {
            echo "  ✗ Failed to read file!\n\n";
            $failedCount++;
            continue;
        }

        // Upload using R2Storage's uploadAudio method (adapted for file content)
        // We'll use the S3 client directly since uploadAudio expects base64
        try {
            $s3Client = new ReflectionClass($r2);
            $s3Property = $s3Client->getProperty('s3Client');
            $s3Property->setAccessible(true);
            $client = $s3Property->getValue($r2);

            $bucketProperty = $s3Client->getProperty('bucketName');
            $bucketProperty->setAccessible(true);
            $bucket = $bucketProperty->getValue($r2);

            $publicUrlProperty = $s3Client->getProperty('publicUrl');
            $publicUrlProperty->setAccessible(true);
            $publicUrl = $publicUrlProperty->getValue($r2);

            // Upload to R2
            $result = $client->putObject([
                'Bucket' => $bucket,
                'Key'    => $r2Path,
                'Body'   => $fileContent,
                'ContentType' => 'audio/mpeg',
                'CacheControl' => 'public, max-age=31536000', // Cache for 1 year
            ]);

            // Build public URL
            $fileUrl = $publicUrl . '/' . $r2Path;

            echo "  ✓ Uploaded successfully!\n";
            echo "  URL: {$fileUrl}\n\n";
            $uploadedCount++;

        } catch (Exception $e) {
            echo "  ✗ Upload failed: " . $e->getMessage() . "\n\n";
            $failedCount++;
        }
    }

    echo "\n=== Upload Summary ===\n";
    echo "Total files: " . count($voiceFiles) . "\n";
    echo "Uploaded: {$uploadedCount}\n";
    echo "Failed: {$failedCount}\n";

    if ($uploadedCount > 0) {
        echo "\n✓ Voice previews are now available on R2!\n";
        echo "Base URL: https://anikwento-r2-public.thesamz20.workers.dev/voice-previews/\n";
    }

} catch (Exception $e) {
    echo "\n✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
