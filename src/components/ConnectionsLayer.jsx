import { centerOf, curvePath } from './edges.js';

export default function ConnectionsLayer({ connections, nodeMap, posOf, onDelete }) {
  return (
    <svg className="edges-layer">
      <defs>
        <marker id="edge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#3a2e22" strokeWidth="1.8" strokeLinecap="round" />
        </marker>
      </defs>
      {connections.map((c) => {
        const a = nodeMap[c.from];
        const b = nodeMap[c.to];
        if (!a || !b) return null;
        const pa = centerOf(a, posOf);
        const pb = centerOf(b, posOf);
        const d = curvePath(pa, pb);
        const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        return (
          <g key={c.id} className="edge">
            <path d={d} className="edge-hit" onClick={() => onDelete?.(c.id)} />
            <path d={d} className="edge-line" markerEnd="url(#edge-arrow)" />
            {c.label && (
              <g transform={`translate(${mid.x}, ${mid.y})`}>
                <rect x="-46" y="-13" width="92" height="26" rx="13" className="edge-label-bg" />
                <text textAnchor="middle" dy="4.5" className="edge-label">{c.label}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
