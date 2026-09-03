import { useState } from 'react';
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
  const [positions, setPositions] = useState(() =>
    Object.fromEntries(Object.values(app.nodes).filter((n) => n.boardId === board.id).map((n) => [n.id, { x: n.x, y: n.y }]))
  );
  const [cam, setCam] = useState({ x: 40, y: 30, zoom: 1 });
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);

  const nodes = Object.values(app.nodes).filter((n) => n.boardId === board.id);
  const conns = app.connections.filter((c) => c.boardId === board.id);
  const posOf = (n) => positions[n.id] || { x: n.x, y: n.y };
  const moveNode = (id, x, y) => setPositions((p) => ({ ...p, [id]: { x, y } }));

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
          <span className="cam-readout">{Math.round(cam.zoom * 100)}%</span>
          <button className="btn solid sm">Share</button>
        </div>
      </header>

      <div className="board-body-row">
        <aside className="tool-rail" aria-label="Tools">
          {TOOLS.map((t) => (
            <button key={t.id} className={`tool ${tool === t.id ? 'active' : ''}`} title={t.label} onClick={() => setTool(t.id)}>
              <span>{t.icon}</span>
            </button>
          ))}
        </aside>

        <div className="canvas-frame">
          <BoardCanvas
            board={board} nodes={nodes} connections={conns} groups={app.groups}
            cam={cam} setCam={setCam} posOf={posOf} moveNode={moveNode}
            selectedId={selectedId} onSelect={setSelectedId} activeTool={tool}
          />
          <div className="canvas-hint">drag canvas to pan · scroll to zoom · drag a card to move it (FR-24…28)</div>
        </div>

        <aside className="props-panel">
          <p className="eyebrow">Inspector</p>
          <h3>{selectedId ? (app.nodes[selectedId]?.title || 'Selected') : 'Nothing selected'}</h3>
          <p className="props-empty">Click a node to select it. Full node editor lands next.</p>
          <div className="props-section">
            <h4>Layers ({nodes.length})</h4>
            {nodes.map((n) => (
              <div className={`layer-row ${selectedId === n.id ? 'on' : ''}`} key={n.id} onClick={() => setSelectedId(n.id)}>
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
