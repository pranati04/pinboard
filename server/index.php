<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

set_exception_handler(function (Throwable $e): void {
    $code = $e instanceof PDOException ? (int) ($e->errorInfo[1] ?? 0) : 0;
    $message = in_array($code, [1049, 1146], true)
        ? 'Database setup is incomplete. Create the database and import server/schema.sql in phpMyAdmin.'
        : 'The database request failed. Check that MySQL is running and server/config.php is correct, then retry.';
    http_response_code(503);
    echo json_encode(['error' => $message]);
});

function out(mixed $data, int $code = 200): void { http_response_code($code); echo json_encode($data); exit; }
function fail(string $msg, int $code = 400): void { out(['error' => $msg], $code); }

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$body = json_decode((string) file_get_contents('php://input'), true) ?: [];

// Auth: Bearer token → user; no token → guest account (keeps "Open studio" instant)
$token = null;
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
if (str_starts_with($authHeader, 'Bearer ')) $token = substr($authHeader, 7);
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

// Owned board, or any public board for reads
function board_for(string $id, string $userId, bool $write = false): ?array {
    $own = get_board($id, $userId);
    if ($own) return $own;
    return $write ? null : get_public_board($id);
}

// ---------- auth ----------

if ($path === '/api/auth/register' && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    if ($name === '') fail('Name is required.');
    if (!str_contains($email, '@')) fail('Please enter a valid email address.');
    if (strlen($password) < 6) fail('Password must be at least 6 characters.');
    try {
        $u = create_user($name, $email, $password);
        seed_new_user($u['id']);
    } catch (Throwable $e) {
        if (str_contains($e->getMessage(), 'Duplicate')) fail('That email is already registered — sign in instead.', 409);
        throw $e;
    }
    $session = create_session($u['id']);
    out(['user' => user_by_token($session), 'token' => $session]);
}

if ($path === '/api/auth/login' && $method === 'POST') {
    $u = verify_user($body['email'] ?? '', $body['password'] ?? '');
    if (!$u) fail('Wrong email or password.', 401);
    $session = create_session($u['id']);
    out(['user' => user_by_token($session), 'token' => $session]);
}

if ($path === '/api/auth/logout' && $method === 'POST') {
    if ($token) delete_session($token);
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
    out(create_board($user['id'], $body['kind'] ?? 'pinboard', $body['title'] ?? null), 201);
}

if (preg_match('#^/api/boards/([^/]+)$#', $path, $m)) {
    $boardId = urldecode($m[1]);
    if ($method === 'GET') {
        $board = board_for($boardId, $user['id']);
        if (!$board) fail('Board not found.', 404);
        out(array_merge(['board' => $board], get_board_doc($board['id'])));
    }
    $board = board_for($boardId, $user['id'], true);
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
    foreach (['nodes', 'connections', 'groups', 'comments'] as $collection) {
        if (!isset($body[$collection]) || !is_array($body[$collection]) || !array_is_list($body[$collection])) {
            fail('A complete board document is required; existing data was not changed.', 422);
        }
        $ids = [];
        foreach ($body[$collection] as $item) {
            if (!is_array($item) || !isset($item['id']) || !is_string($item['id']) || $item['id'] === '' || strlen($item['id']) > 64 || isset($ids[$item['id']])) {
                fail('Every board item must have a unique valid ID.', 422);
            }
            $ids[$item['id']] = true;
        }
    }
    $nodeIds = array_column($body['nodes'], 'id');
    foreach ($body['connections'] as $edge) {
        if (!in_array($edge['from'] ?? null, $nodeIds, true) || !in_array($edge['to'] ?? null, $nodeIds, true)) {
            fail('Connections must refer to existing nodes.', 422);
        }
    }
    foreach ($body['comments'] as $comment) {
        if (!empty($comment['nodeId']) && !in_array($comment['nodeId'], $nodeIds, true)) {
            fail('Comments must refer to existing nodes.', 422);
        }
    }
    save_board_state($board['id'], $user['id'], $body);
    out(['ok' => true]);
}

// ---------- shares ----------

if (preg_match('#^/api/boards/([^/]+)/shares$#', $path, $m)) {
    $board = board_for(urldecode($m[1]), $user['id'], true);
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
    $board = board_for(urldecode($m[1]), $user['id'], true);
    if (!$board) fail('Board not found.', 404);
    delete_share($board['id'], urldecode($m[2]));
    out(get_shares($board['id']));
}

fail('Not found.', 404);
