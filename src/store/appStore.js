import { api } from '../api.js';

export const state = {
  view: { name: 'landing' },
  user: null,
  ready: false,
  boards: [],
  error: '',
};

const listeners = new Set();
let beforeLeave = null;
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => fn(state));
}

export function registerBeforeLeave(fn) {
  beforeLeave = fn;
  return () => { if (beforeLeave === fn) beforeLeave = null; };
}

export async function setView(view) {
  try {
    if (state.view.name === 'board') await beforeLeave?.();
    state.view = view;
    emit();
    return true;
  } catch (error) {
    window.alert(`Your board could not be saved. You are still on this board. ${error.message}`);
    return false;
  }
}
export function setUser(user) {
  state.user = user;
}
export function openBoard(id) {
  return setView({ name: 'board', boardId: id });
}

export async function refreshBoards() {
  try {
    state.boards = await api.get('/api/boards');
    state.error = '';
  } catch (error) {
    state.boards = [];
    state.error = error.message;
  }
}

export async function goDashboard() {
  if (!await setView({ name: 'dashboard' })) return;
  await refreshBoards();
  if (state.view.name === 'dashboard') emit();
}

export async function init() {
  try {
    const me = await api.get('/api/me');
    state.user = me.user?.guest ? null : me.user;
    await refreshBoards();
  } catch (error) { /* server offline — report the connection failure */
    state.error = error.message;
    if (error.status === 401) {
      api.setToken(null);
      state.view = { name: 'login' };
    }
  }
  state.ready = true;
  emit();
}

export async function login(email, password) {
  const r = await api.post('/api/auth/login', { email, password });
  api.setToken(r.token);
  state.user = r.user;
  state.boards = [];
  await refreshBoards();
  emit();
}

export async function register(name, email, password) {
  const r = await api.post('/api/auth/register', { name, email, password });
  api.setToken(r.token);
  state.user = r.user;
  state.boards = [];
  await refreshBoards();
  emit();
}

export async function logout() {
  await beforeLeave?.();
  try { await api.post('/api/auth/logout'); } catch (error) { /* session may be gone */
    if (error.status !== 401) throw error;
  }
  api.setToken(null);
  state.user = null;
  state.boards = [];
  state.error = '';
  await setView({ name: 'landing' });
}

export async function addBoard(kind, title) {
  const b = await api.post('/api/boards', { kind: kind.id, title });
  await refreshBoards();
  return b.id;
}

export async function addBlankBoard(title) {
  return addBoard({ id: 'blank' }, title);
}

export async function deleteBoard(id) {
  await api.del(`/api/boards/${encodeURIComponent(id)}`);
  state.boards = state.boards.filter((board) => board.id !== id);
  emit();
}

export async function updateBoardDetails(id, details) {
  const board = await api.patch(`/api/boards/${encodeURIComponent(id)}`, details);
  state.boards = state.boards.map((item) => item.id === id ? { ...item, ...board } : item);
  return board;
}

export async function updateProfile(details) {
  const result = await api.patch('/api/me', details);
  state.user = result.user;
  return state.user;
}
