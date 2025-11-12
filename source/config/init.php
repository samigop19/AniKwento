<?php



if (!defined('APP_ROOT')) {
    define('APP_ROOT', dirname(dirname(__DIR__)));
}


$appRoot = APP_ROOT;
$docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';


if (file_exists($docRoot . '/source/handlers/db_connection.php')) {

} else {

    $_SERVER['DOCUMENT_ROOT'] = $appRoot;
}
