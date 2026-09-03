const hash = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);

export default function NodeCard({ n, selected, onDragDown, onResizeDown, frameless }) {
  const tilt = frameless ? ((hash(n.id) % 9) - 4) / 10 : ((hash(n.id) % 13) - 6) / 10;
  if (frameless && n.type === 'image') {
    return (
      <div
        className={`mood-photo ${selected ? 'selected' : ''}`}
        style={{ width: n.w, transform: `translate(${n._x}px, ${n._y}px) rotate(${tilt}deg)` }}
        onPointerDown={(e) => onDragDown(e, n)}
      >
        <img src={n.content} alt={n.title} loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        {(n.title || (n.tags || []).length > 0) && (
          <span className="mood-caption">
            {n.title && <em>{n.title}</em>}
            {(n.tags || []).map((t) => <i key={t}>#{t}</i>)}
          </span>
        )}
        <span className="resize-handle" onPointerDown={(e) => onResizeDown(e, n)} title="Resize" />
      </div>
    );
  }
  if (frameless && n.type === 'swatch') {
    return (
      <div
        className={`mood-swatch ${selected ? 'selected' : ''}`}
        style={{ width: n.w, background: n.content, transform: `translate(${n._x}px, ${n._y}px) rotate(${tilt}deg)` }}
        onPointerDown={(e) => onDragDown(e, n)}
      >
        <span>{n.title}</span>
        <code>{n.content}</code>
        <span className="resize-handle" onPointerDown={(e) => onResizeDown(e, n)} title="Resize" />
      </div>
    );
  }
  if (frameless && n.type === 'text') {
    return (
      <div
        className={`mood-note ${selected ? 'selected' : ''}`}
        style={{ width: n.w, transform: `translate(${n._x}px, ${n._y}px) rotate(${tilt}deg)` }}
        onPointerDown={(e) => onDragDown(e, n)}
      >
        <span className="hand">{n.content}</span>
        <span className="resize-handle" onPointerDown={(e) => onResizeDown(e, n)} title="Resize" />
      </div>
    );
  }
  return (
    <div
      className={`node color-${n.color || 'cream'} ${selected ? 'selected' : ''}`}
      style={{ left: 0, top: 0, width: n.w, transform: `translate(${n._x}px, ${n._y}px) rotate(${tilt}deg)` }}
      onPointerDown={(e) => onDragDown(e, n)}
    >
      <span className="pin" />
      <div className="node-head">
        <span className={`node-badge t-${n.type}`}>{n.type}</span>
        <span className="node-title">{n.title}</span>
      </div>
      <div className="node-content" style={n.h ? { minHeight: Math.max(0, n.h - 120) } : undefined}>
        <Content n={n} />
      </div>
      {n.tags?.length > 0 && (
        <div className="node-tags">
          {n.tags.map((t) => <span className="chip" key={t}>#{t}</span>)}
        </div>
      )}
      <span className="resize-handle" onPointerDown={(e) => onResizeDown(e, n)} title="Resize" />
    </div>
  );
}

function Content({ n }) {
  switch (n.type) {
    case 'text':
      return <p className="node-text">{n.content}</p>;
    case 'image':
      return (
        <span className="node-img-wrap">
          <img className="node-img" src={n.content} alt={n.title} loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </span>
      );
    case 'link':
      return (
        <a className="node-linkbox" href={n.content} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()}>
          <span className="node-link-icon">↗</span>
          <span className="node-link-url">{n.content.replace(/^https?:\/\//, '').slice(0, 42)}</span>
          <span className="node-link-open">Open →</span>
        </a>
      );
    case 'video':
      return (
        <span className="node-video-ph" onPointerDown={(e) => e.stopPropagation()}>
          <span className="node-play">▶</span>
          <span className="node-video-meta">{n.content.split('/').pop()}</span>
        </span>
      );
    case 'file':
      return (
        <span className="node-filebox">
          <span className="node-file-icon">▤</span>
          <span>
            <span className="node-file-name">{n.title}</span>
            <span className="node-file-meta">{n.content}</span>
          </span>
        </span>
      );
    case 'audio':
      return (
        <span className="node-audio" onPointerDown={(e) => e.stopPropagation()}>
          <span className="node-play sm">♪</span>
          <span className="node-wave" aria-hidden="true">
            {[5, 9, 6, 12, 8, 4, 10, 7, 11, 5, 8, 6, 9, 5].map((h, i) => (
              <i key={i} style={{ height: h }} />
            ))}
          </span>
          <span className="node-file-meta">{n.content}</span>
        </span>
      );
    default:
      return <p className="node-text">{n.content}</p>;
  }
}
