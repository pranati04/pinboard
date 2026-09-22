import { BOARD_KINDS } from '../data/seed.js';
import { state, setView, logout, openBoard, addBoard, addBlankBoard, deleteBoard, goDashboard, updateProfile, updateBoardDetails } from '../store/appStore.js';
import { esc } from './dom.js';

let query = '';
let kindFilter = null;

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const BG = {
  cork: 'linear-gradient(140deg,#c9a06a,#a97e4b)',
  linen: 'linear-gradient(140deg,#e9e2d2,#cfc4a8)',
  sage: 'linear-gradient(140deg,#9aa78c,#7d8b6f)',
};

export function renderDashboard(el) {
  const user = state.user;
  const initial = (user?.name || 'G')[0].toUpperCase();

  el.innerHTML = `
    <div class="dash">
      <header class="nav">
        <div class="brand" style="cursor: pointer" data-brand>
          <span class="brand-pin"></span>
          <span class="brand-name">Pinboard</span>
        </div>
        <div class="dash-search">
          <span>⌕</span>
          <input data-search value="${esc(query)}" placeholder="Search boards… (FR-43)" />
        </div>
        <div class="dash-user">
          <button class="btn ghost" data-profile aria-label="My profile"><span class="dash-avatar">${esc(initial)}</span> ${esc(user?.name || 'Guest')} · My profile</button>
          <button class="btn ghost" data-logout>${user ? 'Log out' : 'Sign in'}</button>
        </div>
      </header>

      <main class="dash-main">
        <div class="dash-head">
          <div>
            <p class="eyebrow">Dashboard · SRS §9.1</p>
            <h1>Your walls</h1>
          </div>
          <button class="btn solid large" data-new>+ New board</button>
        </div>

        <div class="kind-tabs" data-tabs>
          <button data-kind="" class="${!kindFilter ? 'on' : ''}">All</button>
          ${Object.values(BOARD_KINDS).map((k) => `
            <button data-kind="${k.id}" class="${kindFilter === k.id ? 'on' : ''}">${k.icon} ${k.name}</button>
          `).join('')}
        </div>

        <div class="dashboard-notice" ${state.error ? '' : 'hidden'} role="alert">
          <span>${esc(state.error)}</span>
          <button class="btn outline sm" data-retry>Retry loading</button>
        </div>
        ${!user ? '<p class="dashboard-notice">Guest boards are a shared demo. Sign in or register to keep boards in your own account.</p>' : ''}
        <p class="dashboard-notice" data-action-error role="alert" hidden></p>
        <div class="board-grid" data-grid></div>
        <p class="dash-empty hand" data-empty hidden>nothing pinned here yet — try another search…</p>
      </main>
    </div>`;

  const grid = el.querySelector('[data-grid]');
  const empty = el.querySelector('[data-empty]');

  function renderGrid() {
    const q = query.trim().toLowerCase();
    const boards = state.boards.filter((b) => {
      const okQ = !q || (b.title + ' ' + (b.description || '')).toLowerCase().includes(q);
      const okK = !kindFilter || (b.kind || 'pinboard') === kindFilter;
      return okQ && okK;
    });

    grid.innerHTML = boards.map((b, i) => {
      const kind = BOARD_KINDS[b.kind || 'pinboard'];
      return `
        <article class="board-card" data-board="${esc(b.id)}" style="animation-delay: ${i * 70}ms">
          <div class="board-thumb" style="background: ${BG[b.background] || BG.cork}">
            <div class="mini">
              ${(b.preview || []).slice(0, 5).map((t, j) => `
                <span class="mini-node t-${t}" style="left: ${8 + j * 17}%; top: ${14 + ((j * 37) % 52)}%"></span>
              `).join('')}
            </div>
            <span class="vis ${b.isPublic ? 'pub' : ''}">${b.isPublic ? '◉ public' : '◌ private'}</span>
          </div>
          <div class="board-body">
            <div class="kind-pill">${kind?.icon} ${kind?.name}</div>
            <h3>${esc(b.title)}</h3>
            <p>${esc(b.description)}</p>
            <div class="board-foot">
              <span>${b.nodeCount ?? 0} nodes · ${b.linkCount ?? 0} links</span>
              <span>${timeAgo(b.updatedAt)}</span>
            </div>
            <div class="board-card-actions">
              <button class="btn outline sm" data-open>Open board</button>
              <button class="btn ghost sm" data-rename>Edit details</button>
              <button class="btn ghost sm danger" data-delete aria-label="Delete ${esc(b.title)}">Delete</button>
            </div>
          </div>
        </article>`;
    }).join('');

    empty.hidden = boards.length > 0;
    if (!state.ready) {
      empty.hidden = false;
      empty.textContent = 'loading your walls…';
    } else {
      empty.textContent = 'nothing pinned here yet — try another search…';
    }
  }

  const actionError = el.querySelector('[data-action-error]');
  const showError = (error) => { actionError.textContent = error.message; actionError.hidden = false; };
  grid.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-board]');
    if (!card) return;
    const board = state.boards.find((item) => item.id === card.dataset.board);
    if (e.target.closest('[data-rename]')) { openBoardDetails(board, renderGrid); return; }
    const remove = e.target.closest('[data-delete]');
    if (!remove) { await openBoard(card.dataset.board); return; }
    if (!window.confirm(`Permanently delete "${board.title}" and all its content? This cannot be undone.`)) return;
    remove.disabled = true;
    try { await deleteBoard(board.id); }
    catch (error) { showError(error); remove.disabled = false; }
  });

  el.querySelector('[data-search]').addEventListener('input', (e) => {
    query = e.target.value;
    renderGrid();
  });

  el.querySelector('[data-tabs]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-kind]');
    if (!btn) return;
    const k = btn.dataset.kind || null;
    kindFilter = kindFilter === k ? null : k;
    el.querySelectorAll('[data-kind]').forEach((b) =>
      b.classList.toggle('on', (b.dataset.kind || null) === kindFilter));
    renderGrid();
  });

  el.querySelector('[data-brand]').addEventListener('click', () => setView({ name: 'landing' }));
  el.querySelector('[data-profile]').addEventListener('click', () => setView({ name: user ? 'profile' : 'login' }));
  el.querySelector('[data-retry]').addEventListener('click', goDashboard);
  el.querySelector('[data-logout]').addEventListener('click', async () => {
    if (!user) { await setView({ name: 'login' }); return; }
    try { await logout(); } catch (error) { showError(error); }
  });
  el.querySelector('[data-new]').addEventListener('click', openBoardPicker);

  renderGrid();
}

export function openBoardDetails(board, onUpdated) {
  const dialog = document.createElement('dialog');
  dialog.className = 'modal rename-dialog';
  dialog.setAttribute('aria-label', 'Edit board details');
  dialog.innerHTML = `
    <h2>Edit board details</h2>
    <form class="profile-form">
      <label>Board name<input name="title" value="${esc(board.title)}" required maxlength="255" /></label>
      <label>Description<textarea name="description" aria-label="Description" rows="4" maxlength="2000" placeholder="What is this board for?">${esc(board.description || '')}</textarea></label>
      <small>Optional. Up to 2,000 characters; clear this field to remove the description.</small>
      <p data-error role="alert" hidden></p>
      <div class="board-card-actions">
        <button class="btn outline" type="button" data-cancel>Cancel</button>
        <button class="btn solid" type="submit">Save details</button>
      </div>
    </form>`;
  const form = dialog.querySelector('form');
  const errorEl = dialog.querySelector('[data-error]');
  let saving = false;
  dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;
    const title = form.elements.title.value.trim();
    if (!title) { errorEl.textContent = 'Enter a board name.'; errorEl.hidden = false; return; }
    saving = true;
    const controls = [...form.elements];
    controls.forEach((control) => { control.disabled = true; });
    try {
      const updated = await updateBoardDetails(board.id, { title, description: form.elements.description.value.trim() });
      onUpdated?.(updated);
      dialog.close();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
    } finally {
      saving = false;
      controls.forEach((control) => { control.disabled = false; });
    }
  });
  document.body.appendChild(dialog);
  dialog.showModal();
  form.elements.title.select();
}

export function renderProfile(el) {
  const user = state.user;
  if (!user) { setView({ name: 'login' }); return; }
  const total = (key) => state.boards.reduce((sum, board) => sum + (board[key] || 0), 0);
  el.innerHTML = `
    <div class="dash">
      <header class="nav">
        <button class="btn outline" data-back>Back to boards</button>
        <strong>My profile</strong>
        <button class="btn ghost" data-logout>Log out</button>
      </header>
      <main class="dash-main">
        <div class="dash-head"><div><p class="eyebrow">Your account</p><h1 data-name>${esc(user.name)}</h1></div></div>
        <div class="profile-stats">
          <div><strong>${state.boards.length}</strong><span>Boards</span></div>
          <div><strong>${total('nodeCount')}</strong><span>Nodes</span></div>
          <div><strong>${total('linkCount')}</strong><span>Connections</span></div>
        </div>
        ${state.error ? `<p class="dashboard-notice" role="alert">${esc(state.error)} Board statistics are unavailable.</p>` : ''}
        <div class="profile-columns">
          <section class="profile-card">
            <h2>Account details</h2>
            <p data-email>Email: ${esc(user.email)}</p>
            ${user.createdAt ? `<p>Member since ${esc(new Date(Number(user.createdAt)).toLocaleDateString())}</p>` : ''}
            <form data-profile-form class="profile-form">
              <label>Display name<input name="name" value="${esc(user.name)}" required maxlength="255" autocomplete="name" /></label>
              <label>Email address<input type="email" name="email" value="${esc(user.email)}" required maxlength="255" autocomplete="email" /></label>
              <label>Current password<input type="password" name="currentPassword" autocomplete="current-password" /></label>
              <small>Required only when changing your email or password. Other sessions will be signed out.</small>
              <label>New password<input type="password" name="newPassword" minlength="8" maxlength="72" autocomplete="new-password" /></label>
              <label>Confirm new password<input type="password" name="confirmPassword" minlength="8" maxlength="72" autocomplete="new-password" /></label>
              <small>Leave both new-password fields blank to keep your password.</small>
              <button class="btn solid" type="submit">Save profile</button>
            </form>
            <p data-message role="status" hidden></p>
          </section>
          <section class="profile-card">
            <h2>Your recent boards</h2>
            <div class="profile-boards">
              ${state.boards.slice(0, 5).map((board) => `<button class="btn outline" data-open="${esc(board.id)}">${esc(board.title)}</button>`).join('') || '<p>No boards yet. Create one from your dashboard.</p>'}
            </div>
            <button class="btn solid" data-all>Manage all boards</button>
          </section>
        </div>
      </main>
    </div>`;
  const message = el.querySelector('[data-message]');
  const notify = (text) => { message.textContent = text; message.hidden = false; };
  el.querySelector('[data-back]').addEventListener('click', goDashboard);
  el.querySelector('[data-all]').addEventListener('click', goDashboard);
  el.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openBoard(button.dataset.open)));
  el.querySelector('[data-logout]').addEventListener('click', async () => {
    try { await logout(); } catch (error) { notify(error.message); }
  });
  el.querySelector('[data-profile-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    message.hidden = true;
    const form = event.currentTarget;
    const submit = form.querySelector('button');
    const fields = form.elements;
    if (fields.newPassword.value !== fields.confirmPassword.value) { notify('The new passwords do not match.'); return; }
    if ((fields.email.value.trim().toLowerCase() !== state.user.email || fields.newPassword.value) && !fields.currentPassword.value) {
      notify('Enter your current password to change your email or password.');
      fields.currentPassword.focus();
      return;
    }
    submit.disabled = true;
    try {
      const updated = await updateProfile({
        name: fields.name.value.trim(), email: fields.email.value.trim(),
        currentPassword: fields.currentPassword.value, newPassword: fields.newPassword.value,
      });
      el.querySelector('[data-name]').textContent = updated.name;
      el.querySelector('[data-email]').textContent = `Email: ${updated.email}`;
      fields.name.value = updated.name;
      fields.email.value = updated.email;
      fields.currentPassword.value = fields.newPassword.value = fields.confirmPassword.value = '';
      notify('Profile saved to the database.');
    } catch (error) { notify(error.message); }
    finally { submit.disabled = false; }
  });
}

function openBoardPicker() {
  const veil = document.createElement('div');
  veil.className = 'modal-veil';
  veil.innerHTML = `
    <div class="modal wide">
      <div class="modal-head">
        <div>
          <p class="eyebrow">New board · SRS §10.1</p>
          <h2>What are you making?</h2>
        </div>
        <button class="btn ghost sm" data-close>✕</button>
      </div>
      <p class="dashboard-notice" data-create-error role="alert" hidden></p>
      <div class="kind-grid">
        ${Object.values(BOARD_KINDS).map((k) => `
          <button class="kind-card" data-create="${k.id}">
            <span class="kind-icon">${k.icon}</span>
            <strong>${k.name}</strong>
            <span>${k.blurb}</span>
          </button>
        `).join('')}
        <button class="kind-card" data-blank>
          <span class="kind-icon">⬚</span>
          <strong>Blank corkboard</strong>
          <span>An empty cork wall — no starter card, pin anything.</span>
        </button>
      </div>
    </div>`;

  const close = () => veil.remove();
  veil.addEventListener('click', async (e) => {
    if (e.target === veil || e.target.closest('[data-close]')) return close();
    const card = e.target.closest('[data-blank], [data-create]');
    if (!card || card.disabled) return;
    const buttons = veil.querySelectorAll('button');
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const id = card.hasAttribute('data-blank') ? await addBlankBoard() : await addBoard(BOARD_KINDS[card.dataset.create]);
      close();
      await openBoard(id);
    } catch (error) {
      const errorEl = veil.querySelector('[data-create-error]');
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      buttons.forEach((button) => { button.disabled = false; });
    }
  });
  document.body.appendChild(veil);
}
