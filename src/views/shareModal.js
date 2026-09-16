import { api } from '../api.js';
import { esc } from './dom.js';

export async function openShareModal(board) {
  let isPublic = board.isPublic;
  let rows = [];
  try { rows = await api.get(`/api/boards/${board.id}/shares`); } catch { /* offline */ }
  const link = `${location.origin}/b/${board.id}`;

  const veil = document.createElement('div');
  veil.className = 'modal-veil';
  veil.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div>
          <p class="eyebrow">Sharing · SRS §3.11</p>
          <h2>Share “${esc(board.title)}”</h2>
        </div>
        <button class="btn ghost sm" data-close>✕</button>
      </div>

      <form class="invite-row" data-invite>
        <input name="email" placeholder="teammate@studio.edu" />
        <button class="btn solid sm" type="submit">Invite</button>
      </form>

      <div class="collab-list" data-list></div>

      <div class="public-row">
        <div>
          <strong>Public link</strong>
          <p>Anyone with the link can view this board.</p>
        </div>
        <button class="toggle ${isPublic ? 'on' : ''}" data-toggle aria-pressed="${isPublic}">
          <span></span>
        </button>
      </div>
      <div class="link-row" data-linkrow ${isPublic ? '' : 'hidden'}>
        <code>${esc(link)}</code>
        <button class="btn outline sm" data-copy>Copy</button>
      </div>
    </div>`;

  const list = veil.querySelector('[data-list]');
  const toggle = veil.querySelector('[data-toggle]');
  const linkRow = veil.querySelector('[data-linkrow]');
  const copyBtn = veil.querySelector('[data-copy]');

  function renderRows() {
    list.innerHTML = rows.length ? rows.map((r) => `
      <div class="collab-row" data-email="${esc(r.email)}">
        <span class="dash-avatar">${esc(r.email[0].toUpperCase())}</span>
        <span class="collab-email">${esc(r.email)}</span>
        <select data-role>
          <option value="viewer" ${r.role === 'viewer' ? 'selected' : ''}>Can view</option>
          <option value="editor" ${r.role === 'editor' ? 'selected' : ''}>Can edit</option>
        </select>
        <button class="comment-del" data-revoke title="Revoke access">✕</button>
      </div>`).join('')
      : '<p class="props-empty">Only you can see this board — invite someone or publish the link.</p>';
  }

  veil.querySelector('[data-invite]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.elements.email.value.trim();
    if (!email.includes('@')) return;
    try { rows = await api.post(`/api/boards/${board.id}/shares`, { email, role: 'viewer' }); }
    catch { rows = [...rows, { email, role: 'viewer' }]; }
    renderRows();
    e.target.elements.email.value = '';
  });

  list.addEventListener('change', async (e) => {
    const row = e.target.closest('[data-email]');
    if (row && e.target.matches('[data-role]')) {
      try { rows = await api.post(`/api/boards/${board.id}/shares`, { email: row.dataset.email, role: e.target.value }); } catch { /* offline */ }
    }
  });
  list.addEventListener('click', async (e) => {
    const row = e.target.closest('[data-email]');
    if (row && e.target.closest('[data-revoke]')) {
      const email = row.dataset.email;
      rows = rows.filter((r) => r.email !== email);
      renderRows();
      try { rows = await api.del(`/api/boards/${board.id}/shares/${encodeURIComponent(email)}`); renderRows(); } catch { /* offline */ }
    }
  });

  toggle.addEventListener('click', async () => {
    isPublic = !isPublic;
    toggle.classList.toggle('on', isPublic);
    toggle.setAttribute('aria-pressed', String(isPublic));
    linkRow.hidden = !isPublic;
    try {
      const updated = await api.patch(`/api/boards/${board.id}`, { isPublic });
      board.isPublic = updated.isPublic;
    } catch { /* offline */ }
  });

  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* clipboard unavailable */ }
    copyBtn.textContent = 'Copied ✓';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
  });

  veil.addEventListener('click', (e) => {
    if (e.target === veil || e.target.closest('[data-close]')) veil.remove();
  });

  renderRows();
  document.body.appendChild(veil);
}
