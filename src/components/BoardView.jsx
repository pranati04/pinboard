import BoardCanvas from './BoardCanvas.jsx';

const TOOLS = [
  { id: 'select', icon: '➤', label: 'Select (V)' },
  { id: 'pan', icon: '✥', label: 'Pan (H)' },
  { id: 'connect', icon: '⟡', label: 'Connect (C)' },
  { id: 'text', icon: 'T', label: 'Text note' },
  { id: 'image', icon: '◧', label: 'Image' },
  { id: 'link', icon: '↗', label: 'Link' },
  { id: 'video', icon: '▶', label: 'Video' },
  { id: 'file', icon: '▤', label: 'File' },
  { id: 'audio', icon: '♪', label: 'Audio' },
];

export default function BoardView({ app }) {
  const board = app.boards.find((b) => b.id === app.view.boardId) || app.boards[0];
  const nodes = Object.values(app.nodes).filter((n) => n.boardId === board.id);
  const conns = app.connections.filter((c) => c.boardId === board.id);

  return (
    <div className="board-view">
      <header className="board-topbar">
        <button className="btn ghost sm" onClick={app.goDashboard}>← Boards</button>
        <div className="board-title">
          <span className="brand-pin sm" />
          <h1>{board.title}</h1>
          <span className={`vis static ${board.isPublic ? 'pub' : ''}`}>{board.isPublic ? '◉ public' : '◌ private'}</span>
        </div>
        <div className="board-actions">
          <div className="zoom-pill" aria-hidden="true">
            <button>−</button><span>100%</span><button>+</button>
          </div>
          <button className="btn solid sm">Share</button>
        </div>
      </header>

      <div className="board-body-row">
        <aside className="tool-rail" aria-label="Tools">
          {TOOLS.map((t, i) => (
            <button key={t.id} className={`tool ${i === 0 ? 'active' : ''}`} title={t.label}>
              <span>{t.icon}</span>
            </button>
          ))}
        </aside>

        <div className="canvas-frame">
          <BoardCanvas board={board} nodes={nodes} connections={conns} groups={app.groups} />
          <div className="canvas-hint">drag to pan · scroll to zoom · drop a tool to pin a node</div>
        </div>

        <aside className="props-panel">
          <p className="eyebrow">Inspector</p>
          <h3>Nothing selected</h3>
          <p className="props-empty">Click a node to edit its title, content, tags and size. Node editor lands next.</p>
          <div className="props-section">
            <h4>Layers ({nodes.length})</h4>
            {nodes.map((n) => (
              <div className="layer-row" key={n.id}>
                <span className={`dot t-${n.type}`} />
                <span>{n.title}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
