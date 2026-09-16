import { api } from '../api.js';

export const state = {
  view: { name: 'landing' },
  user: null,
  ready: false,
  boards: [],
};

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => fn(state));
}

export function setView(view) {
  state.view = view;
  emit();
}
export function setUser(user) {
  state.user = user;
}
export function openBoard(id) {
  setView({ name: 'board', boardId: id });
}

async function refreshBoards() {
  state.boards = await api.get('/api/boards').catch(() => state.boards);
}

export async function goDashboard() {
  await refreshBoards();
  setView({ name: 'dashboard' });
}

export async function init() {
  try {
    const me = await api.get('/api/me');
    state.user = me.user?.guest ? null : me.user;
    await refreshBoards();
  } catch { /* server offline — stay on empty state */ }
  state.ready = true;
  emit();
}

export async function login(email, password) {
  const r = await api.post('/api/auth/login', { email, password });
  api.setToken(r.token);
  state.user = r.user;
  await refreshBoards();
  emit();
}

export async function register(name, email, password) {
  const r = await api.post('/api/auth/register', { name, email, password });
  api.setToken(r.token);
  state.user = r.user;
  await refreshBoards();
  emit();
}

export async function logout() {
  try { await api.post('/api/auth/logout'); } catch { /* session may be gone */ }
  api.setToken(null);
  state.user = null;
  await refreshBoards();
}

export async function addBoard(kind, title) {
  const b = await api.post('/api/boards', { kind: kind.id, title });
  state.boards = [b, ...state.boards];
  emit();
  return b.id;
}

export async function addBlankBoard(title) {
  const b = await api.post('/api/boards', { kind: 'blank', title });
  state.boards = [b, ...state.boards];
  emit();
  return b.id;
}
