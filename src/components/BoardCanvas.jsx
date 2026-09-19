import { useEffect, useRef, useState } from 'react';
import NodeCard from './NodeCard.jsx';
import ConnectionsLayer from './ConnectionsLayer.jsx';
import GroupsLayer from './GroupsLayer.jsx';
import { NODE_TYPES } from '../data/seed.js';

const PLACE_TOOLS = new Set(NODE_TYPES);

const TEXTURES = {
  cork: 'radial-gradient(rgba(60,40,20,.16) 1.2px, transparent 1.3px)',
  linen: 'linear-gradient(rgba(43,33,24,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(43,33,24,.06) 1px, transparent 1px)',
  sage: 'radial-gradient(rgba(255,253,247,.14) 1.2px, transparent 1.3px)',
};

const BG = {
  cork: 'linear-gradient(150deg,#cfa96f,#b08852 60%,#97703f)',
  linen: 'linear-gradient(150deg,#ece5d3,#d9cdb2)',
  sage: 'linear-gradient(150deg,#a3b195,#7d8b6f)',
};

const MIN_Z = 0.25;
const MAX_Z = 2;

export default function BoardCanvas({ board, nodes, connections, nodeMap, groups, cam, setCam, posOf, moveNode, resizeNode, selectedId, onSelect, activeTool, connectFrom, onNodeClick, onDeleteEdge, onEditLabel, onPlaceNode, onDrawGroup, dimIds, frameless, palette, onShuffle, moodCount, thoughtMode, rootId, onArrange, mapCount }) {
  const viewRef = useRef(null);
  const dragRef = useRef(null);
  const [draft, setDraft] = useState(null);

  const toWorld = (cx, cy) => {
    const r = viewRef.current.getBoundingClientRect();
    return { x: (cx - r.left - cam.x) / cam.zoom, y: (cy - r.top - cam.y) / cam.zoom };
  };

  useEffect(() => {
    const el = viewRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setCam((c) => {
        const zoom = Math.min(MAX_Z, Math.max(MIN_Z, c.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        const k = zoom / c.zoom;
        return { zoom, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setCam]);

  const zoomBy = (f) => {
    const r = viewRef.current.getBoundingClientRect();
    const mx = r.width / 2;
    const my = r.height / 2;
    setCam((c) => {
      const zoom = Math.min(MAX_Z, Math.max(MIN_Z, c.zoom * f));
      const k = zoom / c.zoom;
      return { zoom, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
    });
  };

  const onViewDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.node') || e.target.closest('.edge')) return;
    if (PLACE_TOOLS.has(activeTool)) {
      onPlaceNode?.(activeTool, toWorld(e.clientX, e.clientY));
      return;
    }
    if (activeTool === 'group') {
      const w = toWorld(e.clientX, e.clientY);
      dragRef.current = { kind: 'group', sx: w.x, sy: w.y };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    onSelect(null);
    dragRef.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragDown = (e, n) => {
    if (e.button !== 0) return;
    if (e.target.closest('.resize-handle')) return;
    e.stopPropagation();
    if (activeTool === 'connect' || activeTool === 'branch') { onNodeClick?.(n); return; }
    onSelect(n.id);
    const w = toWorld(e.clientX, e.clientY);
    const p = posOf(n);
    dragRef.current = { kind: 'node', id: n.id, dx: w.x - p.x, dy: w.y - p.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onResizeDown = (e, n) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(n.id);
    dragRef.current = { kind: 'resize', id: n.id, sx: e.clientX, sy: e.clientY, w: n.w, h: n.h || 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'pan') {
      setCam((c) => ({ ...c, x: d.cx + (e.clientX - d.sx), y: d.cy + (e.clientY - d.sy) }));
    } else if (d.kind === 'node') {
      const w = toWorld(e.clientX, e.clientY);
      moveNode(d.id, Math.round(w.x - d.dx), Math.round(w.y - d.dy));
    } else if (d.kind === 'resize') {
      const dw = (e.clientX - d.sx) / cam.zoom;
      const dh = (e.clientY - d.sy) / cam.zoom;
      resizeNode(d.id, Math.max(170, Math.round(d.w + dw)), Math.max(0, Math.round(d.h + dh)));
    } else if (d.kind === 'group') {
      const w = toWorld(e.clientX, e.clientY);
      setDraft({
        x: Math.round(Math.min(d.sx, w.x)),
        y: Math.round(Math.min(d.sy, w.y)),
        w: Math.round(Math.abs(w.x - d.sx)),
        h: Math.round(Math.abs(w.y - d.sy)),
      });
    }
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === 'group') {
      const rect = draft;
      setDraft(null);
      if (rect && rect.w > 40 && rect.h > 40) onDrawGroup?.(rect);
    }
  };

  const zoomCtl = (
    <span className="zoom-inline">
      <button onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">−</button>
      <span>{Math.round(cam.zoom * 100)}%</span>
      <button onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
      <button onClick={() => setCam({ x: 40, y: 30, zoom: 1 })} aria-label="Reset view">⤢</button>
    </span>
  );

  return (
    <div
      ref={viewRef}
      className={`canvas-scroll ${activeTool === 'pan' ? 'tool-pan' : ''} ${PLACE_TOOLS.has(activeTool) || ['connect', 'branch', 'group'].includes(activeTool) ? 'tool-place' : ''}`}
      style={{ background: BG[board.background] || BG.cork }}
      onPointerDown={onViewDown}
      onPointerMove={onMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="canvas-texture"
        style={{
          backgroundImage: TEXTURES[board.background] || TEXTURES.cork,
          backgroundSize: `${26 * cam.zoom}px ${26 * cam.zoom}px`,
          backgroundPosition: `${cam.x}px ${cam.y}px`,
        }}
      />
      <div
        className="canvas-world"
        style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})` }}
      >
        <GroupsLayer groups={groups || []} boardId={board.id} posOf={posOf} />
        {draft && <div className="group-box draft" style={{ left: draft.x, top: draft.y, width: draft.w, height: draft.h }} />}
        <ConnectionsLayer connections={connections} nodeMap={nodeMap} posOf={posOf} onDelete={onDeleteEdge} onEditLabel={onEditLabel} />
        {nodes.map((n) => {
          const p = posOf(n);
          const extra = connectFrom === n.id ? ' connect-source' : '';
          const dim = dimIds && dimIds.has(n.id) ? ' dimmed' : '';
          return (
            <span key={n.id} className={`node-wrap${extra}${dim}`} style={{ position: 'absolute', left: 0, top: 0, zIndex: selectedId === n.id ? 6 : 3 }}>
              <NodeCard n={{ ...n, _x: p.x, _y: p.y }} selected={selectedId === n.id} onDragDown={onDragDown} onResizeDown={onResizeDown} frameless={frameless} thought={thoughtMode} isRoot={rootId === n.id} />
            </span>
          );
        })}
      </div>

      {thoughtMode ? (
        <div className="mood-dock map-dock">
          <span className="mood-count">{mapCount} thoughts · root first</span>
          {zoomCtl}
          <button onClick={onArrange} title="Auto-arrange the tree">⧉ Auto-arrange</button>
        </div>
      ) : frameless ? (
        <div className="mood-dock">
          <div className="palette-strip" title="Palette pulled from this board's tags">
            {(palette || []).map((c) => (
              <span key={c.hex} className="palette-dot" style={{ background: c.hex }} title={`${c.hex} · #${c.tag}`}>
                <em>{c.hex}</em>
              </span>
            ))}
            {(palette || []).length === 0 && <span className="palette-empty">tag images to grow the palette</span>}
          </div>
          <span className="mood-count">{moodCount} pieces</span>
          {zoomCtl}
          <button onClick={onShuffle} title="Shuffle the collage">⤨ Shuffle</button>
        </div>
      ) : (
        <div className="zoom-float">
          <button onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">−</button>
          <span>{Math.round(cam.zoom * 100)}%</span>
          <button onClick={() => zoomBy(1.25)} aria-label="Zoom in">+</button>
          <button onClick={() => setCam({ x: 40, y: 30, zoom: 1 })} aria-label="Reset view">⤢</button>
        </div>
      )}
    </div>
  );
}
