import { useEffect, useMemo, useRef, useState } from 'react';
import BoardCanvas from './BoardCanvas.jsx';
import NodeEditor from './NodeEditor.jsx';
import Comments from './Comments.jsx';
import { openShareModal } from '../views/shareModal.js';
import { api } from '../api.js';
import { BOARD_KINDS, NODE_TYPES, REL_LABELS } from '../data/seed.js';
import { paletteFromNodes, shuffleLayout } from './moodUtils.js';
import { autoArrange, buildTree, childSpot, findRoot } from './mapUtils.js';

const PIN_TOOLS = [
  { id: 'select', icon: '➤', label: 'Select (V)' },
  { id: 'pan', icon: '✥', label: 'Pan (H)' },
  { id: 'connect', icon: '⟡', label: 'Connect (C)' },
  { id: 'group', icon: '▭', label: 'Draw a group box' },
  { id: 'text', icon: 'T', label: 'Text note' },
  { id: 'image', icon: '◧', label: 'Image' },
  { id: 'link', icon: '↗', label: 'Link' },
  { id: 'video', icon: '▶', label: 'Video' },
  { id: 'file', icon: '▤', label: 'File' },
  { id: 'audio', icon: '♪', label: 'Audio' },
];

const MOOD_TOOLS = [
  { id: 'select', icon: '➤', label: 'Select (V)' },
  { id: 'pan', icon: '✥', label: 'Pan (H)' },
  { id: 'connect', icon: '⟡', label: 'Connect two pieces (C)' },
  { id: 'group', icon: '▭', label: 'Draw a group box' },
  { id: 'image', icon: '◧', label: 'Add image' },
  { id: 'link', icon: '↗', label: 'Add link' },
  { id: 'text', icon: 'T', label: 'Caption note' },
  { id: 'swatch', icon: '◍', label: 'Add colour swatch' },
];

const MAP_TOOLS = [
  { id: 'select', icon: '➤', label: 'Select (V)' },
  { id: 'pan', icon: '✥', label: 'Pan (H)' },
  { id: 'connect', icon: '⟡', label: 'Connect two thoughts (C)' },
  { id: 'group', icon: '▭', label: 'Draw a group box' },
  { id: 'branch', icon: '⑂', label: 'Branch a child thought' },
  { id: 'thought', icon: '○', label: 'Floating thought' },
  { id: 'link', icon: '↗', label: 'Add link' },
  { id: 'arrange', icon: '⧉', label: 'Auto-arrange' },
];

const PLACE_TOOLS = new Set(NODE_TYPES);

const NODE_DEFAULTS = {
  text:  { title: 'Note',         content: 'Type your note here…', w: 260, h: 160, color: 'butter' },
  image: { title: 'Image',        content: 'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=600&q=60', w: 280, h: 0, color: 'cream' },
  link:  { title: 'Link',         content: '',                     w: 250, h: 140, color: 'sky' },
  video: { title: 'Video',        content: 'clip.mp4',             w: 260, h: 170, color: 'cream' },
  file:  { title: 'document.pdf', content: '0 pages · — MB',       w: 230, h: 140, color: 'cream' },
  audio: { title: 'Audio',        content: 'track.mp3',            w: 250, h: 120, color: 'sage' },
};

export default function BoardView({ app }) {
  const board = app.board || app.boards.find((b) => b.id === app.view.boardId) || app.boards[0];
  const kind = BOARD_KINDS[board.kind] || BOARD_KINDS.pinboard;
  const isMood = kind.id === 'moodboard';
  const isMap = kind.id === 'thoughtmap';
  const TOOLS = isMood ? MOOD_TOOLS : isMap ? MAP_TOOLS : PIN_TOOLS;
  const [overrides, setOverrides] = useState({});
  const [panelTab, setPanelTab] = useState('edit');
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
  const [localGroups, setLocalGroups] = useState(() => app.groups.filter((g) => g.boardId === board.id));
  const [connectFrom, setConnectFrom] = useState(null);
  const [pendingEdge, setPendingEdge] = useState(null);

  const nodes = Object.values(app.nodes)
    .filter((n) => n.boardId === board.id)
    .map((n) => ({ ...n, ...(sizes[n.id] ? { w: sizes[n.id].w, h: sizes[n.id].h } : {}), ...(overrides[n.id] || {}) }));
  const selected = selectedId ? nodes.find((n) => n.id === selectedId) || null : null;

  const patchNode = (id, patch) => setOverrides((o) => ({ ...o, [id]: { ...(o[id] || {}), ...patch } }));
  const deleteNode = (id) => {
    setOverrides((o) => ({ ...o, [id]: { ...(o[id] || {}), _deleted: true } }));
    setSelectedId(null);
  };
  const visibleNodes = nodes.filter((n) => !n._deleted);
  const visibleNodeMap = useMemo(() => Object.fromEntries(visibleNodes.map((n) => [n.id, n])), [visibleNodes]);

  const addComment = (c) => setAllComments((all) => [...all, {
    id: `cm-${Date.now()}`, boardId: board.id, author: app.user?.name || 'Guest',
    createdAt: Date.now(), ...c,
  }]);
  const deleteComment = (id) => setAllComments((all) => all.filter((c) => c.id !== id));
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const onNodeClick = (n) => {
    if (tool === 'branch' && isMap) { branchThought(n); setTool('select'); return; }
    if (!connectFrom) { setConnectFrom(n.id); return; }
    if (connectFrom === n.id) { setConnectFrom(null); return; }
    setPendingEdge({ from: connectFrom, to: n.id, label: REL_LABELS[0] });
    setConnectFrom(null);
  };

  const commitEdge = () => {
    if (!pendingEdge) return;
    const label = pendingEdge.label.trim();
    if (pendingEdge.id) {
      setEdges((es) => es.map((c) => (c.id === pendingEdge.id ? { ...c, label } : c)));
    } else {
      setEdges((e) => [...e, { id: `c-${Date.now()}`, boardId: board.id, from: pendingEdge.from, to: pendingEdge.to, label }]);
    }
    setPendingEdge(null);
    setTool('select');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setTool('select');
      setConnectFrom(null);
      setPendingEdge(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const deleteEdge = (id) => setEdges((e) => e.filter((c) => c.id !== id));
  const [allComments, setAllComments] = useState(() => app.comments.filter((c) => c.boardId === board.id));
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

  const palette = useMemo(() => (isMood ? paletteFromNodes(visibleNodes) : []), [isMood, visibleNodes]);
  const doShuffle = () => setPositions((p) => ({ ...p, ...shuffleLayout(visibleNodes, (n) => p[n.id] || { x: n.x, y: n.y }) }));
  const posOf = (n) => positions[n.id] || { x: n.x, y: n.y };
  const moveNode = (id, x, y) => setPositions((p) => ({ ...p, [id]: { x, y } }));
  const resizeNode = (id, w, h) => setSizes((s) => ({ ...s, [id]: { w, h } }));

  const root = isMap ? findRoot(visibleNodes, edges) : null;

  const branchThought = (parent) => {
    const nid = `t-${Date.now()}`;
    const kids = buildTree(root?.id || parent.id, edges);
    const siblings = (kids.get(parent.id) || []).length;
    const spot = childSpot(parent, posOf, siblings, siblings + 1);
    const thought = { id: nid, boardId: board.id, type: 'text', title: 'New thought', content: 'Say it in one line, then branch again.', x: spot.x, y: spot.y, w: 250, h: 140, tags: [], color: 'cream' };
    app.nodes[nid] = thought;
    setOverrides((o) => ({ ...o, [nid]: {} }));
    setPositions((p) => ({ ...p, [nid]: { x: spot.x, y: spot.y } }));
    setSizes((s) => ({ ...s, [nid]: { w: 250, h: 140 } }));
    setEdges((e) => [...e, { id: `c-${Date.now()}`, boardId: board.id, from: parent.id, to: nid, label: 'Leads to' }]);
    setSelectedId(nid);
    setPanelTab('edit');
  };

  const addFloatingThought = () => {
    const nid = `t-${Date.now()}`;
    const spot = { x: 480 + Math.round(Math.random() * 200 - 100), y: 420 + Math.round(Math.random() * 120) };
    app.nodes[nid] = { id: nid, boardId: board.id, type: 'text', title: 'Floating thought', content: 'Not attached yet — drag it near the tree or branch from it.', x: spot.x, y: spot.y, w: 250, h: 140, tags: [], color: 'cream' };
    setOverrides((o) => ({ ...o, [nid]: {} }));
    setPositions((p) => ({ ...p, [nid]: spot }));
    setSizes((s) => ({ ...s, [nid]: { w: 250, h: 140 } }));
    setSelectedId(nid);
    setPanelTab('edit');
  };

  const doArrange = () => {
    const layout = autoArrange(visibleNodes, edges, posOf);
    setPositions((p) => ({ ...p, ...layout }));
  };

  const placeNode = (type, pt) => {
    const d = { ...(NODE_DEFAULTS[type] || NODE_DEFAULTS.text) };
    if (type === 'link') {
      const url = window.prompt('Paste the link URL', 'https://');
      if (url === null) { setTool('select'); return; }
      const clean = url.trim();
      d.content = clean && !/^https?:\/\//i.test(clean) ? `https://${clean}` : clean;
      if (d.content) d.title = d.content.replace(/^https?:\/\//, '').split('/')[0] || 'Link';
    }
    if (type === 'image') {
      const url = window.prompt('Paste the image URL', 'https://');
      if (url !== null && url.trim()) d.content = url.trim();
    }
    const nid = `n-${Date.now()}`;
    const h = d.h || 140;
    const spot = { x: Math.round(pt.x - d.w / 2), y: Math.round(pt.y - h / 2) };
    app.nodes[nid] = { id: nid, boardId: board.id, type, title: d.title, content: d.content, x: spot.x, y: spot.y, w: d.w, h: d.h || 0, tags: [], color: d.color };
    setOverrides((o) => ({ ...o, [nid]: {} }));
    setPositions((p) => ({ ...p, [nid]: spot }));
    setSizes((s) => ({ ...s, [nid]: { w: d.w, h: d.h || 0 } }));
    setSelectedId(nid);
    setPanelTab('edit');
    setTool('select');
  };

  const onDrawGroup = (rect) => {
    const name = window.prompt('Name this group', 'Group');
    if (name !== null) {
      setLocalGroups((gs) => [...gs, { id: `g-${Date.now()}`, boardId: board.id, name: name.trim() || 'Group', ...rect }]);
    }
    setTool('select');
  };

  // Persist the whole board document, debounced — fires after any change
  // to nodes, positions, sizes, edges, groups or comments.
  const savedJson = useRef(null);
  useEffect(() => {
    const doc = {
      nodes: visibleNodes.map((n) => ({
        id: n.id, type: n.type, title: n.title, content: n.content,
        tags: n.tags || [], color: n.color || 'cream',
        x: posOf(n).x, y: posOf(n).y, w: n.w, h: n.h || 0,
      })),
      connections: edges.map(({ id, from, to, label }) => ({ id, from, to, label })),
      groups: localGroups.map(({ id, name, x, y, w, h }) => ({ id, name, x, y, w, h })),
      comments: allComments.map(({ id, nodeId, author, content, createdAt }) => ({ id, nodeId, author, content, createdAt })),
    };
    const json = JSON.stringify(doc);
    if (savedJson.current === null) { savedJson.current = json; return; }
    if (savedJson.current === json) return;
    const t = setTimeout(() => {
      api.put(`/api/boards/${board.id}/state`, doc)
        .then(() => { savedJson.current = json; })
        .catch(() => {});
    }, 700);
    return () => clearTimeout(t);
  });

  const onToolClick = (id) => {
    if (id === 'branch') {
      if (selected) { branchThought(selected); return; }
      setTool('branch');
      return;
    }
    if (id === 'thought') { addFloatingThought(); return; }
    if (id === 'arrange') { doArrange(); return; }
    if (id === 'image' && isMood) {
      const nid = `m-${Date.now()}`;
      const spot = { x: 300 + Math.round(Math.random() * 300), y: 200 + Math.round(Math.random() * 200) };
      app.nodes[nid] = { id: nid, boardId: board.id, type: 'image', title: 'New reference', content: 'https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?w=600&q=60', x: spot.x, y: spot.y, w: 260, h: 0, tags: ['new'], color: 'cream' };
      setOverrides((o) => ({ ...o, [nid]: {} }));
      setPositions((p) => ({ ...p, [nid]: spot }));
      setSizes((s) => ({ ...s, [nid]: { w: 260, h: 0 } }));
      setSelectedId(nid);
      return;
    }
    if (id === 'swatch' && isMood) {
      const nid = `s-${Date.now()}`;
      const hex = ['#c98a2e', '#c4746a', '#7d8b6f', '#6f93a8'][visibleNodes.length % 4];
      const spot = { x: 350 + Math.round(Math.random() * 250), y: 450 + Math.round(Math.random() * 100) };
      app.nodes[nid] = { id: nid, boardId: board.id, type: 'swatch', title: 'Swatch', content: hex, x: spot.x, y: spot.y, w: 170, h: 0, tags: [], color: 'cream' };
      setOverrides((o) => ({ ...o, [nid]: {} }));
      setPositions((p) => ({ ...p, [nid]: spot }));
      setSizes((s) => ({ ...s, [nid]: { w: 170, h: 0 } }));
      setSelectedId(nid);
      return;
    }
    if (id === 'text' && isMood) {
      const nid = `m-${Date.now()}`;
      const spot = { x: 300 + Math.round(Math.random() * 300), y: 250 + Math.round(Math.random() * 200) };
      app.nodes[nid] = { id: nid, boardId: board.id, type: 'text', title: '', content: 'a quiet note in handwriting…', x: spot.x, y: spot.y, w: 260, h: 0, tags: [], color: 'cream' };
      setOverrides((o) => ({ ...o, [nid]: {} }));
      setPositions((p) => ({ ...p, [nid]: spot }));
      setSizes((s) => ({ ...s, [nid]: { w: 260, h: 0 } }));
      setSelectedId(nid);
      return;
    }
    setTool(id);
  };

  return (
    <div className="board-view">
      <header className="board-topbar">
        <button className="btn ghost sm" onClick={app.goDashboard}>← Boards</button>
        <div className="board-title">
          <span className="brand-pin sm" />
          <h1>{board.title}</h1>
          <span className="kind-badge">{kind.icon} {kind.name}</span>
          <span className={`vis static ${board.isPublic ? 'pub' : ''}`}>{board.isPublic ? '◉ public' : '◌ private'}</span>
        </div>
        <div className="board-actions">
          <div className="board-searchbar"><span>⌕</span><input value={boardQuery} onChange={(e) => setBoardQuery(e.target.value)} placeholder="Search nodes… (FR-43)" /></div>
          <span className="cam-readout">{Math.round(cam.zoom * 100)}%</span>
          <button className="btn solid sm" onClick={() => openShareModal(board)}>Share</button>
        </div>
      </header>

      <div className="board-body-row">
        <aside className="tool-rail" aria-label="Tools">
          {TOOLS.map((t) => (
            <button key={t.id} className={`tool ${tool === t.id ? 'active' : ''}`} title={t.label} onClick={() => onToolClick(t.id)}>
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
            board={board} nodes={visibleNodes} connections={edges} nodeMap={visibleNodeMap} groups={localGroups}
            cam={cam} setCam={setCam} posOf={posOf} moveNode={moveNode} resizeNode={resizeNode}
            selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (id) setPanelTab('edit'); }} activeTool={tool}
            connectFrom={connectFrom} onNodeClick={onNodeClick} onDeleteEdge={deleteEdge}
            onEditLabel={(c) => setPendingEdge({ id: c.id, from: c.from, to: c.to, label: c.label || '' })}
            onPlaceNode={placeNode}
            onDrawGroup={onDrawGroup}
            dimIds={dimIds} frameless={isMood} palette={palette}
            onShuffle={doShuffle} moodCount={visibleNodes.length}
            thoughtMode={isMap} rootId={root?.id} onArrange={doArrange} mapCount={visibleNodes.length}
          />
          {isMap && tool === 'branch' && (
            <div className="connect-banner">
              Branch mode: click any thought to grow a child from it
              <button onClick={() => setTool('select')}>✕</button>
            </div>
          )}
          {tool === 'connect' && (
            <div className="connect-banner">
              {connectFrom ? `Source: ${nodeMap[connectFrom]?.title} — now click the target node` : 'Connect mode: click a source node, then a target (FR-30)'}
              <button onClick={() => { setTool('select'); setConnectFrom(null); }}>✕</button>
            </div>
          )}
          {pendingEdge && (
            <div className="edge-dialog">
              <p>{nodeMap[pendingEdge.from]?.title} → {nodeMap[pendingEdge.to]?.title}</p>
              <input
                className="edge-name-input"
                autoFocus
                value={pendingEdge.label}
                onChange={(e) => setPendingEdge({ ...pendingEdge, label: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdge();
                  if (e.key === 'Escape') setPendingEdge(null);
                }}
                placeholder="Name this link — anything goes"
                maxLength={40}
              />
              <div className="edge-labels">
                {REL_LABELS.map((l) => (
                  <button key={l} className={pendingEdge.label === l ? 'on' : ''} onClick={() => setPendingEdge({ ...pendingEdge, label: l })}>{l}</button>
                ))}
              </div>
              <div className="edge-dialog-actions">
                <button className="btn ghost sm" onClick={() => setPendingEdge(null)}>Cancel</button>
                <button className="btn solid sm" onClick={commitEdge}>{pendingEdge.id ? 'Save label' : 'Create link →'}</button>
              </div>
            </div>
          )}
          <div className="canvas-hint">
            {tool === 'group'
              ? 'Drag on the canvas to draw a group box · Esc to cancel'
              : PLACE_TOOLS.has(tool)
                ? `Click anywhere on the canvas to drop a ${tool} node · Esc to cancel`
                : 'pick ⟡ connect, click two cards, name the link anything · click a wire to delete, a label to rename'}
          </div>
        </div>

        <aside className="props-panel">
          <p className="eyebrow">Inspector</p>
          {selected ? (
            <>
              <h3>{selected.title}</h3>
              <div className="tabs">
                <button className={panelTab === 'edit' ? 'on' : ''} onClick={() => setPanelTab('edit')}>Edit</button>
                <button className={panelTab === 'comments' ? 'on' : ''} onClick={() => setPanelTab('comments')}>
                  Comments ({allComments.filter((c) => c.nodeId === selected.id).length})
                </button>
              </div>
              {panelTab === 'edit' ? (
                <NodeEditor
                  node={selected}
                  onChange={patchNode}
                  onDelete={deleteNode}
                  onDuplicate={(id) => {
                    const src = nodes.find((n) => n.id === id);
                    const p = posOf(src);
                    const nid = `n-${Date.now()}`;
                    setOverrides((o) => ({ ...o, [nid]: {} }));
                    setPositions((pp) => ({ ...pp, [nid]: { x: p.x + 32, y: p.y + 32 } }));
                    setSizes((s) => ({ ...s, [nid]: { w: src.w, h: src.h || 0 } }));
                    app.nodes[nid] = { ...src, id: nid, title: src.title + ' (copy)' };
                    setSelectedId(nid);
                  }}
                />
              ) : (
                <Comments comments={allComments} nodeId={selected.id} userName={app.user?.name || 'Guest'} onAdd={addComment} onDelete={deleteComment} />
              )}
            </>
          ) : (
            <>
              <h3>Board discussion</h3>
              <Comments comments={allComments} nodeId={null} userName={app.user?.name || 'Guest'} onAdd={addComment} onDelete={deleteComment} />
            </>
          )}
          <div className="props-section">
            <h4>Layers ({visibleNodes.length})</h4>
            {visibleNodes.map((n) => (
              <div className={`layer-row ${selectedId === n.id ? 'on' : ''}`} key={n.id} onClick={() => { setSelectedId(n.id); setPanelTab('edit'); }}>
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
