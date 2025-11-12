<?php
/**
 * Upload Gamification Audio Files to Cloudflare R2
 * Uploads question background music and correct/wrong answer sound effects
 */

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/source/handlers/r2_storage.php';

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

// Load environment variables
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

// Initialize S3 client for R2
$s3Client = new S3Client([
    'version' => 'latest',
    'region' => $_ENV['R2_REGION'] ?? 'auto',
    'endpoint' => $_ENV['R2_ENDPOINT'],
    'credentials' => [
        'key'    => $_ENV['R2_ACCESS_KEY'],
        'secret' => $_ENV['R2_SECRET_KEY'],
    ],
    'use_path_style_endpoint' => true,
]);

$bucketName = $_ENV['R2_BUCKET'];
$publicUrl = rtrim($_ENV['R2_PUBLIC_URL'], '/');

// Audio files to upload
$audioFiles = [
    'question_bg.mp3' => 'music/Storyboard/question_bg.mp3',
    'correct answer.mp3' => 'music/Storyboard/correct_answer.mp3',
    'wrong answer.mp3' => 'music/Storyboard/wrong_answer.mp3',
];

echo "=== Uploading Gamification Audio Files to R2 ===\n\n";

foreach ($audioFiles as $localFile => $r2Path) {
    $localPath = __DIR__ . '/public/files/music/Storyboard/' . $localFile;

    if (!file_exists($localPath)) {
        echo "❌ File not found: $localPath\n";
        continue;
    }

    try {
        echo "Uploading $localFile...\n";

        // Read file content
        $fileContent = file_get_contents($localPath);
        $fileSize = strlen($fileContent);

        // Upload to R2
        $result = $s3Client->putObject([
            'Bucket' => $bucketName,
            'Key'    => $r2Path,
            'Body'   => $fileContent,
            'ContentType' => 'audio/mpeg',
            'CacheControl' => 'public, max-age=31536000', // Cache for 1 year
        ]);

        // Build public URL
        $fileUrl = $publicUrl . '/' . $r2Path;

        echo "✅ Uploaded successfully!\n";
        echo "   Size: " . round($fileSize / 1024, 2) . " KB\n";
        echo "   URL: $fileUrl\n\n";

    } catch (AwsException $e) {
        echo "❌ Upload failed: " . $e->getMessage() . "\n\n";
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n\n";
    }
}

echo "=== Upload Complete ===\n";
echo "\nR2 Public URLs:\n";
echo "Question BG: $publicUrl/music/Storyboard/question_bg.mp3\n";
echo "Correct Answer: $publicUrl/music/Storyboard/correct_answer.mp3\n";
echo "Wrong Answer: $publicUrl/music/Storyboard/wrong_answer.mp3\n";
