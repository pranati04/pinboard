<?php
declare(strict_types=1);
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

ensure_guest();

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
$user = ($token ? user_by_token($token) : null) ?: guest_user();

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
        fail('Server error: ' . $e->getMessage(), 500);
    }
    out(['user' => $u, 'token' => create_session($u['id'])]);
}

if ($path === '/api/auth/login' && $method === 'POST') {
    $u = verify_user($body['email'] ?? '', $body['password'] ?? '');
    if (!$u) fail('Wrong email or password.', 401);
    out(['user' => $u, 'token' => create_session($u['id'])]);
}

if ($path === '/api/auth/logout' && $method === 'POST') {
    if ($token) delete_session($token);
    out(['ok' => true]);
}

if ($path === '/api/me' && $method === 'GET') {
    out(['user' => $user]);
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
