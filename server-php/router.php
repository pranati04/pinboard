<?php
// Front controller for the PHP built-in server.
//   Dev (API only):        php -S localhost:5174 server-php/router.php
//   All-in-one (serve app): npm run build, then
//                           php -S localhost:5174 -t dist server-php/router.php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (str_starts_with($path, '/api/')) {
    require __DIR__ . '/index.php';
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
