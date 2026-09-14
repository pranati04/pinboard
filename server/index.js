import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5174;

db.ensureGuest();

const app = express();
app.use(express.json({ limit: '4mb' }));

// Auth: Bearer token → user; no token → guest account (keeps "Open studio" instant)
app.use((req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  req.token = token;
  req.user = (token && db.userByToken(token)) || db.guestUser();
  next();
});

const err = (res, status, msg) => res.status(status).json({ error: msg });

// Owned board, or any public board for reads
function boardFor(req, write = false) {
  const own = db.getBoard(req.params.id, req.user.id);
  if (own) return own;
  return write ? null : db.getPublicBoard(req.params.id);
}

// ---------- auth ----------

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim()) return err(res, 400, 'Name is required.');
  if (!email?.includes('@')) return err(res, 400, 'Please enter a valid email address.');
  if (!password || password.length < 6) return err(res, 400, 'Password must be at least 6 characters.');
  try {
    const user = db.createUser(name.trim(), email, password);
    db.seedNewUser(user.id);
    res.json({ user, token: db.createSession(user.id) });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return err(res, 409, 'That email is already registered — sign in instead.');
    throw e;
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = email && password ? db.verifyUser(email, password) : null;
  if (!user) return err(res, 401, 'Wrong email or password.');
  res.json({ user, token: db.createSession(user.id) });
});

app.post('/api/auth/logout', (req, res) => {
  if (req.token) db.deleteSession(req.token);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.user });
});

// ---------- boards ----------

app.get('/api/boards', (req, res) => {
  res.json(db.boardSummaries(req.user.id));
});

app.post('/api/boards', (req, res) => {
  const { kind = 'pinboard', title } = req.body || {};
  res.json(db.createBoard(req.user.id, kind, title));
});

app.get('/api/boards/:id', (req, res) => {
  const board = boardFor(req);
  if (!board) return err(res, 404, 'Board not found.');
  res.json({ board, ...db.getBoardDoc(board.id) });
});

app.put('/api/boards/:id/state', (req, res) => {
  const board = boardFor(req, true);
  if (!board) return err(res, 404, 'Board not found.');
  db.saveBoardState(board.id, req.user.id, req.body || {});
  res.json({ ok: true });
});

app.patch('/api/boards/:id', (req, res) => {
  const board = boardFor(req, true);
  if (!board) return err(res, 404, 'Board not found.');
  db.patchBoard(board.id, req.user.id, req.body || {});
  res.json(db.getBoard(board.id, req.user.id));
});

app.delete('/api/boards/:id', (req, res) => {
  db.deleteBoard(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---------- shares ----------

app.get('/api/boards/:id/shares', (req, res) => {
  const board = boardFor(req, true);
  if (!board) return err(res, 404, 'Board not found.');
  res.json(db.getShares(board.id));
});

app.post('/api/boards/:id/shares', (req, res) => {
  const board = boardFor(req, true);
  if (!board) return err(res, 404, 'Board not found.');
  const { email, role = 'viewer' } = req.body || {};
  if (!email?.includes('@')) return err(res, 400, 'Enter a valid email.');
  db.upsertShare(board.id, email, role === 'editor' ? 'editor' : 'viewer');
  res.json(db.getShares(board.id));
});

app.delete('/api/boards/:id/shares/:email', (req, res) => {
  const board = boardFor(req, true);
  if (!board) return err(res, 404, 'Board not found.');
  db.deleteShare(board.id, req.params.email);
  res.json(db.getShares(board.id));
});

// ---------- static (production build) ----------

const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Pinboard API on http://localhost:${PORT}`));
