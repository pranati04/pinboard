<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/validation.php';

$config = require __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');
configure_cors($config);
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

set_exception_handler(function (Throwable $e): void {
    $code = $e instanceof PDOException ? (int) ($e->errorInfo[1] ?? 0) : 0;
    $message = in_array($code, [1049, 1146], true)
        ? 'Database setup is incomplete. Create the database and import server/schema.sql in phpMyAdmin.'
        : 'The database request failed. Check that MySQL is running and server/config.php is correct, then retry.';
    http_response_code(503);
    echo json_encode(['error' => $message]);
});

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$body = json_decode((string) file_get_contents('php://input'), true) ?: [];

// Auth: HttpOnly cookie (preferred) or Bearer token → user; no token → guest account.
$token = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
if (str_starts_with($authHeader, 'Bearer ')) $token = substr($authHeader, 7);
if (!$token) $token = $_COOKIE['pinboard_session'] ?? null;
if (!$token && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $h = $headers['Authorization'] ?? '';
    if (str_starts_with($h, 'Bearer ')) $token = substr($h, 7);
}
if ($token) {
    $user = user_by_token($token);
    if (!$user && !in_array($path, ['/api/auth/login', '/api/auth/register', '/api/auth/logout'], true)) {
        fail('Your session has expired. Sign in again.', 401);
    }
} else {
    ensure_guest();
    $user = guest_user();
}

if ($path === '/api/uploads' && $method === 'POST') {
    if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) fail('Choose a file to upload.', 422);
    $file = $_FILES['file'];
    if ($file['size'] > 25 * 1024 * 1024) fail('Files must be 25 MB or smaller.', 422);
    $allowed = [
        'application/pdf' => 'pdf', 'text/plain' => 'txt', 'text/csv' => 'csv',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'application/vnd.ms-powerpoint' => 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
        'audio/mpeg' => 'mp3', 'audio/wav' => 'wav', 'audio/ogg' => 'ogg', 'audio/mp4' => 'm4a',
        'video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov',
    ];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!isset($allowed[$mime])) fail('Unsupported file type. Use a document, audio, or video file.', 422);
    $directory = __DIR__ . '/uploads/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $user['id']);
    if (!is_dir($directory) && !mkdir($directory, 0750, true)) fail('The upload directory could not be created.', 503);
    $name = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    $target = $directory . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $target)) fail('The file could not be saved.', 503);
    out(['url' => '/uploads/' . rawurlencode($user['id']) . '/' . $name, 'name' => basename($file['name']), 'size' => (int) $file['size'], 'mime' => $mime], 201);
}

// Owned board, or any public board for reads
function board_for(string $id, string $userId, bool $write = false): ?array {
    $own = get_board($id, $userId);
    if ($own) return $own;
    if ($write) return get_shared_board($id, $userId, true);
    return get_public_board($id) ?: get_shared_board($id, $userId, false);
}

function owner_board_for(string $id, string $userId): ?array { return get_board($id, $userId); }

// ---------- auth ----------

if ($path === '/api/auth/register' && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    if ($name === '') fail('Name is required.');
    if (!str_contains($email, '@')) fail('Please enter a valid email address.');
    if (!is_string($password) || strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0")) fail('Password must be between 8 and 72 bytes.');
    try {
        $u = create_user($name, $email, $password);
        seed_new_user($u['id']);
    } catch (Throwable $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) fail('That email is already registered — sign in instead.', 409);
        throw $e;
    }
    $session = create_session($u['id']);
    set_session_cookie($session);
    out(['user' => user_by_token($session), 'token' => $session]);
}

if ($path === '/api/auth/login' && $method === 'POST') {
    if (!is_string($body['email'] ?? null) || !is_string($body['password'] ?? null)) fail('Email and password are required.');
    $u = verify_user($body['email'] ?? '', $body['password'] ?? '');
    if (!$u) fail('Wrong email or password.', 401);
    $session = create_session($u['id']);
    set_session_cookie($session);
    out(['user' => user_by_token($session), 'token' => $session]);
}

if ($path === '/api/auth/logout' && $method === 'POST') {
    if ($token) delete_session($token);
    set_session_cookie(null);
    out(['ok' => true]);
}

if ($path === '/api/me' && $method === 'GET') {
    out(['user' => $user]);
}

if ($path === '/api/me' && $method === 'PATCH') {
    if (!empty($user['guest'])) fail('Sign in to manage your profile.', 401);
    $name = $body['name'] ?? $user['name'];
    $email = $body['email'] ?? $user['email'];
    $password = $body['newPassword'] ?? '';
    $currentPassword = $body['currentPassword'] ?? '';
    if (!is_string($name) || !preg_match('/^.{1,255}$/us', trim($name))) fail('Enter a display name between 1 and 255 characters.');
    if (!is_string($email) || strlen(trim($email)) > 255 || !filter_var(trim($email), FILTER_VALIDATE_EMAIL)) fail('Enter a valid email address.');
    if (!is_string($password) || !is_string($currentPassword)) fail('Invalid password value.');
    $email = strtolower(trim($email));
    $credentialsChanged = $email !== $user['email'] || $password !== '';
    if ($password !== '' && (strlen($password) < 8 || strlen($password) > 72 || str_contains($password, "\0"))) {
        fail('New password must be between 8 and 72 bytes.');
    }
    if ($credentialsChanged && !verify_user($user['email'], $currentPassword)) fail('Current password is incorrect.', 403);
    $db = pdo();
    $db->beginTransaction();
    try {
        $db->prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')->execute([trim($name), $email, $user['id']]);
        if ($password !== '') {
            $db->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        if ($credentialsChanged) {
            $db->prepare('DELETE FROM sessions WHERE user_id = ? AND token <> ?')->execute([$user['id'], $token]);
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        if ($e instanceof PDOException && (int) ($e->errorInfo[1] ?? 0) === 1062) fail('That email address is already in use.', 409);
        throw $e;
    }
    out(['user' => user_by_token($token)]);
}

// ---------- boards ----------

if ($path === '/api/boards' && $method === 'GET') {
    out(board_summaries($user['id']));
}

if ($path === '/api/boards' && $method === 'POST') {
    if (!is_string($body['kind'] ?? 'pinboard') || (isset($body['title']) && !is_string($body['title']))) fail('Invalid board details.');
    out(create_board($user['id'], $body['kind'] ?? 'pinboard', $body['title'] ?? null), 201);
}

if (preg_match('#^/api/boards/([^/]+)$#', $path, $m)) {
    $boardId = urldecode($m[1]);
    if ($method === 'GET') {
        $board = board_for($boardId, $user['id']);
        if (!$board) fail('Board not found.', 404);
        out(array_merge(['board' => $board], get_board_doc($board['id'])));
    }
    $board = owner_board_for($boardId, $user['id']);
    if (!$board) fail('Board not found.', 404);
    if ($method === 'PATCH') {
        if (array_key_exists('title', $body)) {
            if (!is_string($body['title']) || !preg_match('/^.{1,255}$/us', trim($body['title']))) {
                fail('Enter a board name between 1 and 255 characters.');
            }
            $body['title'] = trim($body['title']);
        }
        if (array_key_exists('description', $body)) {
            if (!is_string($body['description']) || !preg_match('/^.{0,2000}$/us', $body['description'])) {
                fail('Description must be text with at most 2,000 characters.');
            }
            $body['description'] = trim($body['description']);
        }
        patch_board($board['id'], $user['id'], $body);
        out(get_board($board['id'], $user['id']));
    }
    if ($method === 'DELETE') {
        delete_board($board['id'], $user['id']);
        out(['ok' => true]);
    }
}

if (preg_match('#^/api/boards/([^/]+)/state$#', $path, $m) && $method === 'PUT') {
    $board = board_for(urldecode($m[1]), $user['id'], true);
    if (!$board) fail('Board not found.', 404);
    validate_board_document($body);
    if (isset($body['version']) && (!is_int($body['version']) || $body['version'] < 1)) {
        fail('Board version must be a positive integer.', 422);
    }
    try {
        $version = save_board_state($board['id'], $board['userId'], $body, $body['version'] ?? null);
    } catch (BoardConflict $e) {
        fail($e->getMessage(), 409);
    }
    out(['ok' => true, 'version' => $version]);
}

// ---------- shares ----------

if (preg_match('#^/api/boards/([^/]+)/shares$#', $path, $m)) {
    $board = owner_board_for(urldecode($m[1]), $user['id']);
    if (!$board) fail('Board not found.', 404);
    if ($method === 'GET') out(get_shares($board['id']));
    if ($method === 'POST') {
        $email = trim($body['email'] ?? '');
        if (!str_contains($email, '@')) fail('Enter a valid email.');
        upsert_share($board['id'], $email, ($body['role'] ?? 'viewer') === 'editor' ? 'editor' : 'viewer');
        out(get_shares($board['id']));
    }
}

if (preg_match('#^/api/boards/([^/]+)/shares/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $board = owner_board_for(urldecode($m[1]), $user['id']);
    if (!$board) fail('Board not found.', 404);
    delete_share($board['id'], urldecode($m[2]));
    out(get_shares($board['id']));
}

fail('Not found.', 404);
