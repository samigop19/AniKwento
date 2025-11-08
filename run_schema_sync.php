<?php
/**
 * Web-accessible Railway Database Schema Sync
 *
 * Access via: https://your-domain/run_schema_sync.php
 */

// Set execution time limit for long-running migration
set_time_limit(300); // 5 minutes

// Output buffer to show progress in real-time
if (ob_get_level() == 0) ob_start();

header('Content-Type: text/plain; charset=utf-8');

echo "===========================================\n";
echo "Railway Database Schema Sync\n";
echo "===========================================\n\n";

// Include the migration script
require_once __DIR__ . '/sync_railway_schema.php';

// Flush output buffer
if (ob_get_level() > 0) ob_end_flush();
