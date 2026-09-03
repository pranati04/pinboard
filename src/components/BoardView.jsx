import { useMemo, useState } from 'react';
import BoardCanvas from './BoardCanvas.jsx';
import { REL_LABELS } from '../data/seed.js';

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
  const [sizes, setSizes] = useState(() =>
    Object.fromEntries(Object.values(app.nodes).filter((n) => n.boardId === board.id).map((n) => [n.id, { w: n.w, h: n.h || 0 }]))
  );
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);
  const [edges, setEdges] = useState(() => app.connections.filter((c) => c.boardId === board.id));
  const [connectFrom, setConnectFrom] = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);

  const nodes = Object.values(app.nodes)
    .filter((n) => n.boardId === board.id)
    .map((n) => ({ ...n, ...(sizes[n.id] ? { w: sizes[n.id].w, h: sizes[n.id].h } : {}) }));
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const onNodeClick = (n) => {
    if (!connectFrom) { setConnectFrom(n.id); return; }
    if (connectFrom === n.id) { setConnectFrom(null); return; }
    setPendingEdge({ from: connectFrom, to: n.id, label: REL_LABELS[0] });
    setConnectFrom(null);
  };

  const commitEdge = () => {
    if (!pendingEdge) return;
    setEdges((e) => [...e, { id: `c-${Date.now()}`, boardId: board.id, ...pendingEdge }]);
    setPendingEdge(null);
    setTool('select');
  };

  const deleteEdge = (id) => setEdges((e) => e.filter((c) => c.id !== id));
  const [boardQuery, setBoardQuery] = useState('');
  const [activeTag, setActiveTag] = useState(null);

  const allTags = useMemo(() => [...new Set(nodes.flatMap((n) => n.tags || []))], [nodes]);

  const dimIds = useMemo(() => {
    const q = boardQuery.trim().toLowerCase();
    if (!q && !activeTag) return null;
    const hide = new Set();
    nodes.forEach((n) => {
      const okQ = !q || (n.title + ' ' + (n.content || '')).toLowerCase().includes(q);
      const okT = !activeTag || (n.tags || []).includes(activeTag);
      if (!(okQ && okT)) hide.add(n.id);
    });
    return hide;
  }, [nodes, boardQuery, activeTag]);

  const posOf = (n) => positions[n.id] || { x: n.x, y: n.y };
  const moveNode = (id, x, y) => setPositions((p) => ({ ...p, [id]: { x, y } }));
  const resizeNode = (id, w, h) => setSizes((s) => ({ ...s, [id]: { w, h } }));

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
          <div className="board-searchbar"><span>⌕</span><input value={boardQuery} onChange={(e) => setBoardQuery(e.target.value)} placeholder="Search nodes… (FR-43)" /></div>
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
          <div className="tag-filter">
            {allTags.map((t) => (
              <button key={t} className={activeTag === t ? 'on' : ''} onClick={() => setActiveTag(activeTag === t ? null : t)}>#{t}</button>
            ))}
            {(boardQuery || activeTag) && <button className="clear" onClick={() => { setBoardQuery(''); setActiveTag(null); }}>✕ clear</button>}
          </div>
          <BoardCanvas
            board={board} nodes={nodes} connections={edges} nodeMap={nodeMap} groups={app.groups}
            cam={cam} setCam={setCam} posOf={posOf} moveNode={moveNode} resizeNode={resizeNode}
            selectedId={selectedId} onSelect={setSelectedId} activeTool={tool}
            connectFrom={connectFrom} onNodeClick={onNodeClick} onDeleteEdge={deleteEdge}
            dimIds={dimIds}
          />
          {tool === 'connect' && (
            <div className="connect-banner">
              {connectFrom ? `Source: ${nodeMap[connectFrom]?.title} — now click the target node` : 'Connect mode: click a source node, then a target (FR-30)'}
              <button onClick={() => { setTool('select'); setConnectFrom(null); }}>✕</button>
            </div>
          )}
          {pendingEdge && (
            <div className="edge-dialog">
              <p>{nodeMap[pendingEdge.from]?.title} → {nodeMap[pendingEdge.to]?.title}</p>
              <div className="edge-labels">
                {REL_LABELS.map((l) => (
                  <button key={l} className={pendingEdge.label === l ? 'on' : ''} onClick={() => setPendingEdge({ ...pendingEdge, label: l })}>{l}</button>
                ))}
              </div>
              <div className="edge-dialog-actions">
                <button className="btn ghost sm" onClick={() => setPendingEdge(null)}>Cancel</button>
                <button className="btn solid sm" onClick={commitEdge}>Create link →</button>
              </div>
            </div>
          )}
          <div className="canvas-hint">pick ⟡ connect, click two cards, label the link · click a wire to delete (FR-30…35)</div>
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
