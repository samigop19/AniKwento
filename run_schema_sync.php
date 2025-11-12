<?php



set_time_limit(300); 


if (ob_get_level() == 0) ob_start();

header('Content-Type: text/plain; charset=utf-8');

echo "===========================================\n";
echo "Railway Database Schema Sync\n";
echo "===========================================\n\n";


require_once __DIR__ . '/sync_railway_schema.php';


if (ob_get_level() > 0) ob_end_flush();
