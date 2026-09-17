import React from 'react';
import { createRoot } from 'react-dom/client';
import BoardView from './components/BoardView.jsx';
import { api } from './api.js';
import { state, goDashboard } from './store/appStore.js';

let root = null;
const docs = {};

// The board workspace is the one truly interactive surface — pan/zoom canvas,
// drag physics, connect mode — so it stays a React island. The container is
// hidden rather than unmounted when navigating away, so board state survives.
export async function mountBoard(el, boardId) {
  if (!root) root = createRoot(el);
  if (!docs[boardId]) {
    root.render(<div className="board-loading hand">opening board…</div>);
    try {
      docs[boardId] = await api.get(`/api/boards/${boardId}`);
    } catch {
      root.render(
        <div className="board-loading">
          <p>Couldn’t open this board.</p>
          <button className="btn outline" onClick={goDashboard}>← Back to boards</button>
        </div>
      );
      return;
    }
  }
  root.render(
    <React.StrictMode>
      <BoardView key={boardId} app={boardApp(docs[boardId])} />
    </React.StrictMode>
  );
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
