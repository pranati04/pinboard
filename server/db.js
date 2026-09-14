import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { BOARD_KINDS, seedBoards, seedNodes, seedConnections, seedGroups, seedComments } from '../src/data/seed.js';

const dbPath = fileURLToPath(new URL('./corkboard.db', import.meta.url));
export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'pinboard',
    title TEXT NOT NULL,
    description TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    background TEXT NOT NULL DEFAULT 'cork',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (id, user_id)
  );
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT NOT NULL,
    board_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    title TEXT,
    content TEXT,
    x REAL DEFAULT 0, y REAL DEFAULT 0,
    w REAL DEFAULT 250, h REAL DEFAULT 0,
    tags TEXT DEFAULT '[]',
    color TEXT DEFAULT 'cream',
    PRIMARY KEY (id, board_id)
  );
  CREATE TABLE IF NOT EXISTS connections (
    id TEXT NOT NULL,
    board_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    label TEXT,
    PRIMARY KEY (id, board_id)
  );
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT NOT NULL,
    board_id TEXT NOT NULL,
    name TEXT,
    x REAL DEFAULT 0, y REAL DEFAULT 0, w REAL DEFAULT 0, h REAL DEFAULT 0,
    PRIMARY KEY (id, board_id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT NOT NULL,
    board_id TEXT NOT NULL,
    node_id TEXT,
    author TEXT,
    content TEXT,
    created_at INTEGER,
    PRIMARY KEY (id, board_id)
  );
  CREATE TABLE IF NOT EXISTS shares (
    board_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    PRIMARY KEY (board_id, email)
  );
`);

// ---------- auth ----------

const hash = (password, salt) => crypto.scryptSync(password, salt, 32).toString('hex');

export function createUser(name, email, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const id = `u-${crypto.randomBytes(6).toString('hex')}`;
  db.prepare('INSERT INTO users (id, name, email, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, email.toLowerCase(), hash(password, salt), salt, Date.now());
  return { id, name, email: email.toLowerCase() };
}

export function verifyUser(email, password) {
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!u || hash(password, u.salt) !== u.pass_hash) return null;
  return { id: u.id, name: u.name, email: u.email };
}

export function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, Date.now());
  return token;
}

export function userByToken(token) {
  return db.prepare(`
    SELECT u.id, u.name, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?
  `).get(token) || null;
}

export function deleteSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ---------- boards ----------

const rowToBoard = (r) => ({
  id: r.id, kind: r.kind, title: r.title, description: r.description,
  isPublic: !!r.is_public, background: r.background, updatedAt: r.updated_at,
});

export function getBoard(boardId, userId) {
  const r = db.prepare('SELECT * FROM boards WHERE id = ? AND user_id = ?').get(boardId, userId);
  return r ? rowToBoard(r) : null;
}

export function getPublicBoard(boardId) {
  const r = db.prepare('SELECT * FROM boards WHERE id = ? AND is_public = 1').get(boardId);
  return r ? rowToBoard(r) : null;
}

export function boardSummaries(userId) {
  const boards = db.prepare('SELECT * FROM boards WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
  const nodeCount = db.prepare('SELECT COUNT(*) c FROM nodes WHERE board_id = ?');
  const linkCount = db.prepare('SELECT COUNT(*) c FROM connections WHERE board_id = ?');
  const preview = db.prepare('SELECT type FROM nodes WHERE board_id = ? LIMIT 5');
  return boards.map((b) => ({
    ...rowToBoard(b),
    nodeCount: nodeCount.get(b.id).c,
    linkCount: linkCount.get(b.id).c,
    preview: preview.all(b.id).map((n) => n.type),
  }));
}

export function createBoard(userId, kindId, title) {
  const kind = BOARD_KINDS[kindId] || BOARD_KINDS.pinboard;
  const id = `board-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  db.prepare(`INSERT INTO boards (id, user_id, kind, title, description, is_public, background, updated_at)
              VALUES (?, ?, ?, ?, ?, 0, ?, ?)`)
    .run(id, userId, kind.id, title || `Untitled ${kind.name.toLowerCase()}`, kind.blurb,
      kind.id === 'moodboard' ? 'linen' : kind.id === 'thoughtmap' ? 'sage' : 'cork', Date.now());
  if (kindId !== 'blank') {
    const starterId = `s-${Date.now()}`;
    const starter = kind.id === 'thoughtmap'
      ? { type: 'text', title: 'Central thought', content: 'Double-click to rename, then branch ideas off it.', x: 480, y: 140, w: 280, h: 150, tags: ['root'], color: 'butter' }
      : kind.id === 'moodboard'
        ? { type: 'text', title: 'Direction', content: 'Paste image URLs to grow the collage — the palette builds itself.', x: 300, y: 200, w: 280, h: 150, tags: ['direction'], color: 'butter' }
        : { type: 'text', title: 'First pin', content: 'Drag me around. Use the rail to add notes, images and links.', x: 300, y: 200, w: 260, h: 160, tags: ['todo'], color: 'butter' };
    db.prepare(`INSERT INTO nodes (id, board_id, type, title, content, x, y, w, h, tags, color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(starterId, id, starter.type, starter.title, starter.content, starter.x, starter.y, starter.w, starter.h, JSON.stringify(starter.tags), starter.color);
  }
  return { id, kind: kind.id, title: title || `Untitled ${kind.name.toLowerCase()}` };
}

export function patchBoard(boardId, userId, patch) {
  const sets = [];
  const vals = [];
  if (patch.title !== undefined) { sets.push('title = ?'); vals.push(patch.title); }
  if (patch.isPublic !== undefined) { sets.push('is_public = ?'); vals.push(patch.isPublic ? 1 : 0); }
  if (patch.background !== undefined) { sets.push('background = ?'); vals.push(patch.background); }
  if (!sets.length) return;
  sets.push('updated_at = ?');
  vals.push(Date.now(), boardId, userId);
  db.prepare(`UPDATE boards SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals);
}

export function deleteBoard(boardId, userId) {
  const stmts = ['nodes', 'connections', 'groups', 'comments', 'shares']
    .map((t) => db.prepare(`DELETE FROM ${t} WHERE board_id = ?`));
  db.exec('BEGIN');
  try {
    stmts.forEach((s) => s.run(boardId));
    db.prepare('DELETE FROM boards WHERE id = ? AND user_id = ?').run(boardId, userId);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- board document ----------

const rowToNode = (r) => ({
  id: r.id, boardId: r.board_id, type: r.type, title: r.title, content: r.content,
  x: r.x, y: r.y, w: r.w, h: r.h, tags: JSON.parse(r.tags || '[]'), color: r.color,
});
const rowToConn = (r) => ({ id: r.id, boardId: r.board_id, from: r.from_id, to: r.to_id, label: r.label });
const rowToGroup = (r) => ({ id: r.id, boardId: r.board_id, name: r.name, x: r.x, y: r.y, w: r.w, h: r.h });
const rowToComment = (r) => ({ id: r.id, boardId: r.board_id, nodeId: r.node_id, author: r.author, content: r.content, createdAt: r.created_at });

export function getBoardDoc(boardId) {
  return {
    nodes: db.prepare('SELECT * FROM nodes WHERE board_id = ?').all(boardId).map(rowToNode),
    connections: db.prepare('SELECT * FROM connections WHERE board_id = ?').all(boardId).map(rowToConn),
    groups: db.prepare('SELECT * FROM groups WHERE board_id = ?').all(boardId).map(rowToGroup),
    comments: db.prepare('SELECT * FROM comments WHERE board_id = ? ORDER BY created_at').all(boardId).map(rowToComment),
  };
}

export function saveBoardState(boardId, userId, doc) {
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM nodes WHERE board_id = ?').run(boardId);
    db.prepare('DELETE FROM connections WHERE board_id = ?').run(boardId);
    db.prepare('DELETE FROM groups WHERE board_id = ?').run(boardId);
    db.prepare('DELETE FROM comments WHERE board_id = ?').run(boardId);

    const insNode = db.prepare(`INSERT INTO nodes (id, board_id, type, title, content, x, y, w, h, tags, color)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const n of doc.nodes || []) {
      insNode.run(n.id, boardId, n.type || 'text', n.title || '', n.content ?? '', n.x || 0, n.y || 0, n.w || 250, n.h || 0, JSON.stringify(n.tags || []), n.color || 'cream');
    }
    const insConn = db.prepare('INSERT INTO connections (id, board_id, from_id, to_id, label) VALUES (?, ?, ?, ?, ?)');
    for (const c of doc.connections || []) insConn.run(c.id, boardId, c.from, c.to, c.label || '');
    const insGroup = db.prepare('INSERT INTO groups (id, board_id, name, x, y, w, h) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const g of doc.groups || []) insGroup.run(g.id, boardId, g.name || '', g.x || 0, g.y || 0, g.w || 0, g.h || 0);
    const insComment = db.prepare('INSERT INTO comments (id, board_id, node_id, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    for (const c of doc.comments || []) insComment.run(c.id, boardId, c.nodeId || null, c.author || '', c.content || '', c.createdAt || Date.now());

    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ? AND user_id = ?').run(Date.now(), boardId, userId);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// ---------- shares ----------

export const getShares = (boardId) =>
  db.prepare('SELECT email, role FROM shares WHERE board_id = ?').all(boardId);

export const upsertShare = (boardId, email, role) =>
  db.prepare('INSERT INTO shares (board_id, email, role) VALUES (?, ?, ?) ON CONFLICT (board_id, email) DO UPDATE SET role = excluded.role')
    .run(boardId, email.toLowerCase(), role);

export const deleteShare = (boardId, email) =>
  db.prepare('DELETE FROM shares WHERE board_id = ? AND email = ?').run(boardId, email.toLowerCase());

// ---------- seed / guest ----------

const GUEST_ID = 'guest';

export function guestUser() {
  return { id: GUEST_ID, name: 'Guest', email: 'guest@pinboard.local', guest: true };
}

function cloneSeedBoards(userId) {
  const insBoard = db.prepare(`INSERT INTO boards (id, user_id, kind, title, description, is_public, background, updated_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insNode = db.prepare(`INSERT INTO nodes (id, board_id, type, title, content, x, y, w, h, tags, color)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insConn = db.prepare('INSERT INTO connections (id, board_id, from_id, to_id, label) VALUES (?, ?, ?, ?, ?)');
  const insGroup = db.prepare('INSERT INTO groups (id, board_id, name, x, y, w, h) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insComment = db.prepare('INSERT INTO comments (id, board_id, node_id, author, content, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN');
  try {
    const idMap = {};
    for (const b of seedBoards) {
      const newId = `${b.id}-${userId}`;
      idMap[b.id] = newId;
      insBoard.run(newId, userId, b.kind, b.title, b.description, b.isPublic ? 1 : 0, b.background, b.updatedAt);
    }
    for (const n of Object.values(seedNodes)) {
      insNode.run(n.id, idMap[n.boardId], n.type, n.title, n.content, n.x, n.y, n.w, n.h || 0, JSON.stringify(n.tags || []), n.color || 'cream');
    }
    for (const c of seedConnections) insConn.run(c.id, idMap[c.boardId], c.from, c.to, c.label);
    for (const g of seedGroups) insGroup.run(g.id, idMap[g.boardId], g.name, g.x, g.y, g.w, g.h);
    for (const c of seedComments) insComment.run(c.id, idMap[c.boardId], c.nodeId, c.author, c.content, c.createdAt);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function ensureGuest() {
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(GUEST_ID)) {
    const salt = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO users (id, name, email, pass_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(GUEST_ID, 'Guest', 'guest@pinboard.local', hash(crypto.randomBytes(12).toString('hex'), salt), salt, Date.now());
  }
  if (!db.prepare('SELECT id FROM boards WHERE user_id = ? LIMIT 1').get(GUEST_ID)) {
    cloneSeedBoards(GUEST_ID);
  }
}

export function seedNewUser(userId) {
  cloneSeedBoards(userId);
}
