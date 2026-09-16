import { BOARD_KINDS } from '../data/seed.js';
import { state, setView, logout, openBoard, addBoard, addBlankBoard } from '../store/appStore.js';
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
          <span class="dash-avatar">${esc(initial)}</span>
          <span class="dash-name">${esc(user?.name || 'Guest')}</span>
          <button class="btn ghost" data-logout>Log out</button>
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
        <article class="board-card" data-board="${b.id}" style="animation-delay: ${i * 70}ms">
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

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-board]');
    if (card) openBoard(card.dataset.board);
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
  el.querySelector('[data-logout]').addEventListener('click', async () => {
    await logout();
    setView({ name: 'landing' });
  });
  el.querySelector('[data-new]').addEventListener('click', openBoardPicker);

  renderGrid();
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
    if (e.target.closest('[data-blank]')) {
      const id = await addBlankBoard();
      close();
      openBoard(id);
      return;
    }
    const card = e.target.closest('[data-create]');
    if (card) {
      const kind = BOARD_KINDS[card.dataset.create];
      const id = await addBoard(kind);
      close();
      openBoard(id);
    }
  });
  document.body.appendChild(veil);
}
