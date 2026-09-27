<?php
// Front controller for the PHP built-in server.
//   Dev (API only):        php -S 127.0.0.1:5174 server/router.php
//   All-in-one (serve app): npm run build, then
//                           php -S 127.0.0.1:5174 -t dist server/router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (str_starts_with($path, '/api/')) {
    require __DIR__ . '/index.php';
    return true;
}

if (str_starts_with($path, '/uploads/')) {
    $relative = substr($path, strlen('/uploads/'));
    if (!preg_match('#^[a-zA-Z0-9_-]+/[a-f0-9]{32}\.(pdf|txt|csv|doc|docx|xls|xlsx|ppt|pptx|mp3|wav|ogg|m4a|mp4|webm|mov)$#', $relative)) {
        http_response_code(404);
        return true;
    }
    $file = __DIR__ . '/uploads/' . $relative;
    if (!is_file($file)) {
        http_response_code(404);
        return true;
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($file));
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    return true;
}

// static file if it exists under the docroot
$file = $_SERVER['DOCUMENT_ROOT'] . $path;
if ($path !== '/' && is_file($file)) return false;

// SPA fallback — serve index.html for everything else
$index = rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/index.html';
if (is_file($index)) {
    header('Content-Type: text/html');
    readfile($index);
    return true;
}

http_response_code(404);
echo 'Not found';
return true;
