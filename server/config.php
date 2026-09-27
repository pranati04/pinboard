<?php
// MySQL connection settings — adjust for your setup (XAMPP defaults shown).
return [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'name' => getenv('DB_NAME') ?: 'pinboard',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') ?: '',
    // Comma-separated origins. Keep this explicit in production.
    'allowed_origins' => getenv('APP_ORIGINS') ?: 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174',
];
