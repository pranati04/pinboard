import React from 'react';
import { createRoot } from 'react-dom/client';
import BoardView from './components/BoardView.jsx';
import { api } from './api.js';
import { state, goDashboard } from './store/appStore.js';

let root = null;
let mountedKey = null;
let request = 0;

// The board workspace is the one truly interactive surface — pan/zoom canvas,
// drag physics, connect mode — so it stays a React island. Pending saves finish
// before leaving; reopening fetches the latest document from the database.
export async function mountBoard(el, boardId) {
  if (!root) root = createRoot(el);
  const key = `${state.user?.id || 'guest'}:${boardId}`;
  if (mountedKey === key) return;
  mountedKey = key;
  const current = ++request;
  root.render(<div className="board-loading hand">Opening board...</div>);
  try {
    const doc = await api.get(`/api/boards/${encodeURIComponent(boardId)}`);
    if (current !== request) return;
    root.render(
      <React.StrictMode>
        <BoardView key={key} app={boardApp(doc)} />
      </React.StrictMode>
    );
  } catch (error) {
    if (current !== request) return;
    mountedKey = null;
    root.render(
      <div className="board-loading">
        <p role="alert">{error.message}</p>
        <button className="btn outline" onClick={() => mountBoard(el, boardId)}>Retry</button>
        <button className="btn outline" onClick={goDashboard}>Back to boards</button>
      </div>
    );
  }
}

export function closeBoard() {
  mountedKey = null;
  request++;
  root?.render(null);
}

function boardApp(doc) {
  return {
    view: { name: 'board', boardId: doc.board.id },
    user: state.user,
    board: doc.board,
    boards: state.boards,
    nodes: Object.fromEntries(doc.nodes.map((n) => [n.id, n])),
    connections: doc.connections,
    groups: doc.groups,
    comments: doc.comments,
    goDashboard,
  };
}
