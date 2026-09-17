import { state, subscribe, init } from './store/appStore.js';
import { initLanding } from './views/landing.js';
import { renderAuth } from './views/auth.js';
import { renderDashboard } from './views/dashboard.js';
import { mountBoard } from './board.jsx';

const views = {
  landing: document.getElementById('view-landing'),
  auth: document.getElementById('view-auth'),
  dashboard: document.getElementById('view-dashboard'),
  board: document.getElementById('view-board'),
};

const show = (el) => { el.style.display = ''; };
const hide = (el) => { el.style.display = 'none'; };

function render() {
  const name = state.view.name || 'landing';
  Object.values(views).forEach(hide);
  window.scrollTo(0, 0);

  if (name === 'login' || name === 'register') {
    renderAuth(views.auth, name);
    show(views.auth);
  } else if (name === 'dashboard') {
    renderDashboard(views.dashboard);
    show(views.dashboard);
  } else if (name === 'board') {
    mountBoard(views.board, state.view.boardId);
    show(views.board);
  } else {
    show(views.landing);
  }
}

initLanding();
subscribe(render);
render();
init();
