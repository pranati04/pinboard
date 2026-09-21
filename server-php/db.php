<?php
declare(strict_types=1);

function pdo(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $cfg = require __DIR__ . '/config.php';
    $opts = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    $root = new PDO("mysql:host={$cfg['host']};charset=utf8mb4", $cfg['user'], $cfg['pass'], $opts);
    $root->exec("CREATE DATABASE IF NOT EXISTS `{$cfg['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo = new PDO("mysql:host={$cfg['host']};dbname={$cfg['name']};charset=utf8mb4", $cfg['user'], $cfg['pass'], $opts);
    bootstrap($pdo);
    return $pdo;
}

function bootstrap(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        pass_hash VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        created_at BIGINT NOT NULL,
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS boards (
        id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        kind VARCHAR(32) NOT NULL DEFAULT 'pinboard',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        is_public TINYINT NOT NULL DEFAULT 0,
        background VARCHAR(32) NOT NULL DEFAULT 'cork',
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (id, user_id)
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS nodes (
        id VARCHAR(64) NOT NULL,
        board_id VARCHAR(64) NOT NULL,
        type VARCHAR(16) NOT NULL DEFAULT 'text',
        title VARCHAR(255),
        content TEXT,
        x DOUBLE DEFAULT 0, y DOUBLE DEFAULT 0,
        w DOUBLE DEFAULT 250, h DOUBLE DEFAULT 0,
        tags TEXT,
        color VARCHAR(32) DEFAULT 'cream',
        PRIMARY KEY (id, board_id)
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR(64) NOT NULL,
        board_id VARCHAR(64) NOT NULL,
        from_id VARCHAR(64) NOT NULL,
        to_id VARCHAR(64) NOT NULL,
        label VARCHAR(255),
        PRIMARY KEY (id, board_id)
    ) ENGINE=InnoDB");
    // NOTE: `groups` is reserved in MySQL 8 — table is named board_groups.
    $pdo->exec("CREATE TABLE IF NOT EXISTS board_groups (
        id VARCHAR(64) NOT NULL,
        board_id VARCHAR(64) NOT NULL,
        name VARCHAR(255),
        x DOUBLE DEFAULT 0, y DOUBLE DEFAULT 0, w DOUBLE DEFAULT 0, h DOUBLE DEFAULT 0,
        PRIMARY KEY (id, board_id)
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(64) NOT NULL,
        board_id VARCHAR(64) NOT NULL,
        node_id VARCHAR(64) NULL,
        author VARCHAR(255),
        content TEXT,
        created_at BIGINT,
        PRIMARY KEY (id, board_id)
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS shares (
        board_id VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(16) NOT NULL DEFAULT 'viewer',
        PRIMARY KEY (board_id, email)
    ) ENGINE=InnoDB");
}

function now_ms(): int { return (int) round(microtime(true) * 1000); }

// ---------- seed data (mirrors src/data/seed.js) ----------

function board_kinds(): array {
    return [
        'pinboard'   => ['id' => 'pinboard',   'name' => 'Pinboard',    'blurb' => 'Mixed-media cards, pins and labelled links — the classic corkboard.'],
        'moodboard'  => ['id' => 'moodboard',  'name' => 'Moodboard',   'blurb' => 'Frameless image collage with palette extraction and shuffle.'],
        'thoughtmap' => ['id' => 'thoughtmap', 'name' => 'Thought map', 'blurb' => 'Branching ideas from a central thought with auto-arrange.'],
    ];
}

function seed_boards(): array {
    $now = now_ms();
    return [
        ['id' => 'board-thesis', 'kind' => 'pinboard', 'title' => 'Thesis — Visual Arguments',
         'description' => 'Research threads, references and open questions for the dissertation.',
         'isPublic' => false, 'background' => 'cork', 'updatedAt' => $now - 1000 * 60 * 42],
        ['id' => 'board-mood', 'kind' => 'moodboard', 'title' => 'Moodboard — Autumn Editorial',
         'description' => 'Palette, texture and layout references for the autumn issue.',
         'isPublic' => true, 'background' => 'linen', 'updatedAt' => $now - 1000 * 60 * 60 * 5],
        ['id' => 'board-launch', 'kind' => 'thoughtmap', 'title' => 'Thought map — Studio Launch',
         'description' => 'One central idea branching into milestones, assets and references.',
         'isPublic' => false, 'background' => 'sage', 'updatedAt' => $now - 1000 * 60 * 60 * 26],
    ];
}

function seed_nodes(): array {
    return [
        ['id' => 'n1', 'boardId' => 'board-thesis', 'type' => 'text', 'title' => 'Core claim', 'content' => 'Spatial arrangement improves recall — argue with the 1976 paired-associate study + our pilot.', 'x' => 120, 'y' => 140, 'w' => 250, 'h' => 170, 'tags' => ['thesis', 'claim'], 'color' => 'cream'],
        ['id' => 'n2', 'boardId' => 'board-thesis', 'type' => 'link', 'title' => 'Cognitive maps paper', 'content' => 'https://example.edu/cognitive-maps', 'x' => 430, 'y' => 120, 'w' => 250, 'h' => 150, 'tags' => ['reference'], 'color' => 'sky'],
        ['id' => 'n3', 'boardId' => 'board-thesis', 'type' => 'image', 'title' => 'Pilot results', 'content' => 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=60', 'x' => 180, 'y' => 380, 'w' => 280, 'h' => 210, 'tags' => ['data'], 'color' => 'cream'],
        ['id' => 'n4', 'boardId' => 'board-thesis', 'type' => 'text', 'title' => 'Open question', 'content' => 'Does grouping help more than linking? Design the A/B before Friday.', 'x' => 540, 'y' => 360, 'w' => 250, 'h' => 170, 'tags' => ['todo'], 'color' => 'blush'],
        ['id' => 'n5', 'boardId' => 'board-thesis', 'type' => 'file', 'title' => 'interview-notes.pdf', 'content' => '12 pages · 2.1 MB', 'x' => 830, 'y' => 180, 'w' => 230, 'h' => 140, 'tags' => ['fieldwork'], 'color' => 'cream'],
        ['id' => 'm1', 'boardId' => 'board-mood', 'type' => 'image', 'title' => 'Ochre wall', 'content' => 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=600&q=60', 'x' => 90, 'y' => 110, 'w' => 300, 'h' => 0, 'tags' => ['palette', 'ochre'], 'color' => 'cream'],
        ['id' => 'm2', 'boardId' => 'board-mood', 'type' => 'image', 'title' => 'Linen texture', 'content' => 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=600&q=60', 'x' => 430, 'y' => 150, 'w' => 280, 'h' => 0, 'tags' => ['texture', 'neutral'], 'color' => 'cream'],
        ['id' => 'm3', 'boardId' => 'board-mood', 'type' => 'image', 'title' => 'Ceramic still life', 'content' => 'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=600&q=60', 'x' => 250, 'y' => 420, 'w' => 260, 'h' => 0, 'tags' => ['texture', 'warm'], 'color' => 'cream'],
        ['id' => 'm4', 'boardId' => 'board-mood', 'type' => 'text', 'title' => 'Direction', 'content' => 'Warm, quiet, tactile. Fraunces headlines + generous whitespace.', 'x' => 560, 'y' => 430, 'w' => 260, 'h' => 150, 'tags' => ['direction'], 'color' => 'butter'],
        ['id' => 'l1', 'boardId' => 'board-launch', 'type' => 'text', 'title' => 'Studio relaunch', 'content' => 'Ship the new portfolio site before the autumn issue drops.', 'x' => 480, 'y' => 120, 'w' => 280, 'h' => 160, 'tags' => ['root'], 'color' => 'butter'],
        ['id' => 'l2', 'boardId' => 'board-launch', 'type' => 'text', 'title' => 'Freeze scope Friday', 'content' => 'Beta to 5 testers with the feedback board link attached.', 'x' => 170, 'y' => 380, 'w' => 250, 'h' => 150, 'tags' => ['plan'], 'color' => 'cream'],
        ['id' => 'l3', 'boardId' => 'board-launch', 'type' => 'link', 'title' => 'Type scale ref', 'content' => 'https://example.com/type-scale', 'x' => 500, 'y' => 400, 'w' => 250, 'h' => 140, 'tags' => ['reference'], 'color' => 'sky'],
        ['id' => 'l4', 'boardId' => 'board-launch', 'type' => 'text', 'title' => 'Hero loop', 'content' => 'Cut the 6-second loop; pair with Fraunces display headline.', 'x' => 820, 'y' => 380, 'w' => 250, 'h' => 150, 'tags' => ['asset'], 'color' => 'cream'],
    ];
}

function seed_connections(): array {
    return [
        ['id' => 'c1', 'boardId' => 'board-thesis', 'from' => 'n1', 'to' => 'n2', 'label' => 'Supports'],
        ['id' => 'c2', 'boardId' => 'board-thesis', 'from' => 'n1', 'to' => 'n4', 'label' => 'Leads to'],
        ['id' => 'c3', 'boardId' => 'board-thesis', 'from' => 'n3', 'to' => 'n4', 'label' => 'Example of'],
        ['id' => 'c4', 'boardId' => 'board-launch', 'from' => 'l1', 'to' => 'l2', 'label' => 'Leads to'],
        ['id' => 'c5', 'boardId' => 'board-launch', 'from' => 'l1', 'to' => 'l3', 'label' => 'Related to'],
        ['id' => 'c6', 'boardId' => 'board-launch', 'from' => 'l1', 'to' => 'l4', 'label' => 'Depends on'],
    ];
}

function seed_groups(): array {
    return [['id' => 'g1', 'boardId' => 'board-thesis', 'name' => 'Evidence', 'x' => 100, 'y' => 90, 'w' => 640, 'h' => 230]];
}

function seed_comments(): array {
    return [['id' => 'cm1', 'boardId' => 'board-thesis', 'nodeId' => null, 'author' => 'Pranati',
             'content' => 'Added the pilot chart — check the axis labels before review.', 'createdAt' => now_ms() - 1000 * 60 * 60 * 3]];
}

// ---------- auth ----------

function create_user(string $name, string $email, string $password): array {
    $id = 'u-' . bin2hex(random_bytes(6));
    pdo()->prepare('INSERT INTO users (id, name, email, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([$id, $name, strtolower($email), password_hash($password, PASSWORD_DEFAULT), now_ms()]);
    return ['id' => $id, 'name' => $name, 'email' => strtolower($email)];
}

function verify_user(string $email, string $password): ?array {
    $st = pdo()->prepare('SELECT * FROM users WHERE email = ?');
    $st->execute([strtolower($email)]);
    $u = $st->fetch();
    if (!$u || !password_verify($password, $u['pass_hash'])) return null;
    return ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email']];
}

function create_session(string $userId): string {
    $token = bin2hex(random_bytes(24));
    pdo()->prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
        ->execute([$token, $userId, now_ms()]);
    return $token;
}

function user_by_token(string $token): ?array {
    $st = pdo()->prepare('SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?');
    $st->execute([$token]);
    return $st->fetch() ?: null;
}

function delete_session(string $token): void {
    pdo()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
}

// ---------- boards ----------

function row_to_board(array $r): array {
    return [
        'id' => $r['id'], 'kind' => $r['kind'], 'title' => $r['title'],
        'description' => $r['description'], 'isPublic' => (bool) $r['is_public'],
        'background' => $r['background'], 'updatedAt' => (int) $r['updated_at'],
    ];
}

function get_board(string $boardId, string $userId): ?array {
    $st = pdo()->prepare('SELECT * FROM boards WHERE id = ? AND user_id = ?');
    $st->execute([$boardId, $userId]);
    $r = $st->fetch();
    return $r ? row_to_board($r) : null;
}

function get_public_board(string $boardId): ?array {
    $st = pdo()->prepare('SELECT * FROM boards WHERE id = ? AND is_public = 1');
    $st->execute([$boardId]);
    $r = $st->fetch();
    return $r ? row_to_board($r) : null;
}

function board_summaries(string $userId): array {
    $st = pdo()->prepare('SELECT * FROM boards WHERE user_id = ? ORDER BY updated_at DESC');
    $st->execute([$userId]);
    $nc = pdo()->prepare('SELECT COUNT(*) c FROM nodes WHERE board_id = ?');
    $lc = pdo()->prepare('SELECT COUNT(*) c FROM connections WHERE board_id = ?');
    $pv = pdo()->prepare('SELECT type FROM nodes WHERE board_id = ? LIMIT 5');
    return array_map(function ($b) use ($nc, $lc, $pv) {
        $nc->execute([$b['id']]); $lc->execute([$b['id']]); $pv->execute([$b['id']]);
        return array_merge(row_to_board($b), [
            'nodeCount' => (int) $nc->fetch()['c'],
            'linkCount' => (int) $lc->fetch()['c'],
            'preview' => array_column($pv->fetchAll(), 'type'),
        ]);
    }, $st->fetchAll());
}

function create_board(string $userId, string $kindId, ?string $title): array {
    $kinds = board_kinds();
    $kind = $kinds[$kindId] ?? $kinds['pinboard'];
    if ($kindId === 'blank') {
        $kind = ['id' => 'pinboard', 'name' => 'Corkboard', 'blurb' => 'A blank wall — pin whatever you like.'];
    }
    $id = 'board-' . now_ms() . '-' . bin2hex(random_bytes(3));
    $bg = $kind['id'] === 'moodboard' ? 'linen' : ($kind['id'] === 'thoughtmap' ? 'sage' : 'cork');
    $title = $title ?: 'Untitled ' . strtolower($kind['name']);
    pdo()->prepare('INSERT INTO boards (id, user_id, kind, title, description, is_public, background, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
        ->execute([$id, $userId, $kind['id'], $title, $kind['blurb'], $bg, now_ms()]);
    if ($kindId !== 'blank') {
        $starter = $kind['id'] === 'thoughtmap'
            ? ['type' => 'text', 'title' => 'Central thought', 'content' => 'Double-click to rename, then branch ideas off it.', 'x' => 480, 'y' => 140, 'w' => 280, 'h' => 150, 'tags' => ['root'], 'color' => 'butter']
            : ($kind['id'] === 'moodboard'
                ? ['type' => 'text', 'title' => 'Direction', 'content' => 'Paste image URLs to grow the collage — the palette builds itself.', 'x' => 300, 'y' => 200, 'w' => 280, 'h' => 150, 'tags' => ['direction'], 'color' => 'butter']
                : ['type' => 'text', 'title' => 'First pin', 'content' => 'Drag me around. Use the rail to add notes, images and links.', 'x' => 300, 'y' => 200, 'w' => 260, 'h' => 160, 'tags' => ['todo'], 'color' => 'butter']);
        pdo()->prepare('INSERT INTO nodes (id, board_id, type, title, content, x, y, w, h, tags, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute(['s-' . now_ms(), $id, $starter['type'], $starter['title'], $starter['content'], $starter['x'], $starter['y'], $starter['w'], $starter['h'], json_encode($starter['tags']), $starter['color']]);
    }
    return ['id' => $id, 'kind' => $kind['id'], 'title' => $title];
}

function patch_board(string $boardId, string $userId, array $patch): void {
    $sets = []; $vals = [];
    if (array_key_exists('title', $patch)) { $sets[] = 'title = ?'; $vals[] = $patch['title']; }
    if (array_key_exists('isPublic', $patch)) { $sets[] = 'is_public = ?'; $vals[] = $patch['isPublic'] ? 1 : 0; }
    if (array_key_exists('background', $patch)) { $sets[] = 'background = ?'; $vals[] = $patch['background']; }
    if (!$sets) return;
    $sets[] = 'updated_at = ?';
    $vals[] = now_ms(); $vals[] = $boardId; $vals[] = $userId;
    pdo()->prepare('UPDATE boards SET ' . implode(', ', $sets) . ' WHERE id = ? AND user_id = ?')->execute($vals);
}

function delete_board(string $boardId, string $userId): void {
    $db = pdo();
    $db->beginTransaction();
    try {
        foreach (['nodes', 'connections', 'board_groups', 'comments', 'shares'] as $t) {
            $db->prepare("DELETE FROM $t WHERE board_id = ?")->execute([$boardId]);
        }
        $db->prepare('DELETE FROM boards WHERE id = ? AND user_id = ?')->execute([$boardId, $userId]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }
}

// ---------- board document ----------

function get_board_doc(string $boardId): array {
    $db = pdo();
    $nodes = $db->prepare('SELECT * FROM nodes WHERE board_id = ?'); $nodes->execute([$boardId]);
    $conns = $db->prepare('SELECT * FROM connections WHERE board_id = ?'); $conns->execute([$boardId]);
    $groups = $db->prepare('SELECT * FROM board_groups WHERE board_id = ?'); $groups->execute([$boardId]);
    $comments = $db->prepare('SELECT * FROM comments WHERE board_id = ? ORDER BY created_at'); $comments->execute([$boardId]);
    return [
        'nodes' => array_map(fn($r) => [
            'id' => $r['id'], 'boardId' => $r['board_id'], 'type' => $r['type'],
            'title' => $r['title'], 'content' => $r['content'],
            'x' => (float) $r['x'], 'y' => (float) $r['y'], 'w' => (float) $r['w'], 'h' => (float) $r['h'],
            'tags' => json_decode($r['tags'] ?: '[]', true), 'color' => $r['color'],
        ], $nodes->fetchAll()),
        'connections' => array_map(fn($r) => [
            'id' => $r['id'], 'boardId' => $r['board_id'], 'from' => $r['from_id'], 'to' => $r['to_id'], 'label' => $r['label'],
        ], $conns->fetchAll()),
        'groups' => array_map(fn($r) => [
            'id' => $r['id'], 'boardId' => $r['board_id'], 'name' => $r['name'],
            'x' => (float) $r['x'], 'y' => (float) $r['y'], 'w' => (float) $r['w'], 'h' => (float) $r['h'],
        ], $groups->fetchAll()),
        'comments' => array_map(fn($r) => [
            'id' => $r['id'], 'boardId' => $r['board_id'], 'nodeId' => $r['node_id'],
            'author' => $r['author'], 'content' => $r['content'], 'createdAt' => (int) $r['created_at'],
        ], $comments->fetchAll()),
    ];
}

function save_board_state(string $boardId, string $userId, array $doc): void {
    $db = pdo();
    $db->beginTransaction();
    try {
        foreach (['nodes', 'connections', 'board_groups', 'comments'] as $t) {
            $db->prepare("DELETE FROM $t WHERE board_id = ?")->execute([$boardId]);
        }
        $insNode = $db->prepare('INSERT INTO nodes (id, board_id, type, title, content, x, y, w, h, tags, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        foreach ($doc['nodes'] ?? [] as $n) {
            $insNode->execute([$n['id'], $boardId, $n['type'] ?? 'text', $n['title'] ?? '', $n['content'] ?? '', $n['x'] ?? 0, $n['y'] ?? 0, $n['w'] ?? 250, $n['h'] ?? 0, json_encode($n['tags'] ?? []), $n['color'] ?? 'cream']);
        }
        $insConn = $db->prepare('INSERT INTO connections (id, board_id, from_id, to_id, label) VALUES (?, ?, ?, ?, ?)');
        foreach ($doc['connections'] ?? [] as $c) $insConn->execute([$c['id'], $boardId, $c['from'], $c['to'], $c['label'] ?? '']);
        $insGroup = $db->prepare('INSERT INTO board_groups (id, board_id, name, x, y, w, h) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($doc['groups'] ?? [] as $g) $insGroup->execute([$g['id'], $boardId, $g['name'] ?? '', $g['x'] ?? 0, $g['y'] ?? 0, $g['w'] ?? 0, $g['h'] ?? 0]);
        $insComment = $db->prepare('INSERT INTO comments (id, board_id, node_id, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($doc['comments'] ?? [] as $c) $insComment->execute([$c['id'], $boardId, $c['nodeId'] ?? null, $c['author'] ?? '', $c['content'] ?? '', $c['createdAt'] ?? now_ms()]);
        $db->prepare('UPDATE boards SET updated_at = ? WHERE id = ? AND user_id = ?')->execute([now_ms(), $boardId, $userId]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }
}

// ---------- shares ----------

function get_shares(string $boardId): array {
    $st = pdo()->prepare('SELECT email, role FROM shares WHERE board_id = ?');
    $st->execute([$boardId]);
    return $st->fetchAll();
}

function upsert_share(string $boardId, string $email, string $role): void {
    pdo()->prepare('INSERT INTO shares (board_id, email, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)')
        ->execute([$boardId, strtolower($email), $role]);
}

function delete_share(string $boardId, string $email): void {
    pdo()->prepare('DELETE FROM shares WHERE board_id = ? AND email = ?')->execute([$boardId, strtolower($email)]);
}

// ---------- seed / guest ----------

const GUEST_ID = 'guest';

function guest_user(): array {
    return ['id' => GUEST_ID, 'name' => 'Guest', 'email' => 'guest@pinboard.local', 'guest' => true];
}

function clone_seed_boards(string $userId): void {
    $db = pdo();
    $insBoard = $db->prepare('INSERT INTO boards (id, user_id, kind, title, description, is_public, background, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $insNode = $db->prepare('INSERT INTO nodes (id, board_id, type, title, content, x, y, w, h, tags, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $insConn = $db->prepare('INSERT INTO connections (id, board_id, from_id, to_id, label) VALUES (?, ?, ?, ?, ?)');
    $insGroup = $db->prepare('INSERT INTO board_groups (id, board_id, name, x, y, w, h) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $insComment = $db->prepare('INSERT INTO comments (id, board_id, node_id, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    $db->beginTransaction();
    try {
        $idMap = [];
        foreach (seed_boards() as $b) {
            $newId = $b['id'] . '-' . $userId;
            $idMap[$b['id']] = $newId;
            $insBoard->execute([$newId, $userId, $b['kind'], $b['title'], $b['description'], $b['isPublic'] ? 1 : 0, $b['background'], $b['updatedAt']]);
        }
        foreach (seed_nodes() as $n) {
            $insNode->execute([$n['id'], $idMap[$n['boardId']], $n['type'], $n['title'], $n['content'], $n['x'], $n['y'], $n['w'], $n['h'] ?? 0, json_encode($n['tags'] ?? []), $n['color'] ?? 'cream']);
        }
        foreach (seed_connections() as $c) $insConn->execute([$c['id'], $idMap[$c['boardId']], $c['from'], $c['to'], $c['label']]);
        foreach (seed_groups() as $g) $insGroup->execute([$g['id'], $idMap[$g['boardId']], $g['name'], $g['x'], $g['y'], $g['w'], $g['h']]);
        foreach (seed_comments() as $c) $insComment->execute([$c['id'], $idMap[$c['boardId']], $c['nodeId'], $c['author'], $c['content'], $c['createdAt']]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }
}

function ensure_guest(): void {
    $st = pdo()->prepare('SELECT id FROM users WHERE id = ?');
    $st->execute([GUEST_ID]);
    if (!$st->fetch()) {
        pdo()->prepare('INSERT INTO users (id, name, email, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([GUEST_ID, 'Guest', 'guest@pinboard.local', password_hash(bin2hex(random_bytes(12)), PASSWORD_DEFAULT), now_ms()]);
    }
    $st = pdo()->prepare('SELECT id FROM boards WHERE user_id = ? LIMIT 1');
    $st->execute([GUEST_ID]);
    if (!$st->fetch()) clone_seed_boards(GUEST_ID);
}

function seed_new_user(string $userId): void {
    clone_seed_boards($userId);
}
