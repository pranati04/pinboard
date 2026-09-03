import { useMemo, useState } from 'react';

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const BG = {
  cork: 'linear-gradient(140deg,#c9a06a,#a97e4b)',
  linen: 'linear-gradient(140deg,#e9e2d2,#cfc4a8)',
  sage: 'linear-gradient(140deg,#9aa78c,#7d8b6f)',
};

export default function Dashboard({ app }) {
  const [query, setQuery] = useState('');
  const boards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return app.boards;
    return app.boards.filter((b) =>
      (b.title + ' ' + (b.description || '')).toLowerCase().includes(q)
    );
  }, [app.boards, query]);

  return (
    <div className="dash">
      <header className="nav">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => app.setView({ name: 'landing' })}>
          <span className="brand-pin" />
          <span className="brand-name">Pinboard</span>
        </div>
        <div className="dash-search">
          <span>⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search boards… (FR-43)" />
        </div>
        <div className="dash-user">
          <span className="dash-avatar">{(app.user?.name || 'G')[0].toUpperCase()}</span>
          <span className="dash-name">{app.user?.name || 'Guest'}</span>
          <button className="btn ghost" onClick={() => { app.setUser(null); app.setView({ name: 'landing' }); }}>Log out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <p className="eyebrow">Dashboard · SRS §9.1</p>
            <h1>Your walls</h1>
          </div>
          <button className="btn solid large" onClick={() => app.openBoard(app.boards[0].id)}>+ New board</button>
        </div>

        <div className="board-grid">
          {boards.map((b, i) => (
            <article className="board-card" key={b.id} onClick={() => app.openBoard(b.id)} style={{ animationDelay: `${i * 70}ms` }}>
              <div className="board-thumb" style={{ background: BG[b.background] || BG.cork }}>
                <MiniPreview nodes={Object.values(app.nodes).filter((n) => n.boardId === b.id)} />
                <span className={`vis ${b.isPublic ? 'pub' : ''}`}>{b.isPublic ? '◉ public' : '◌ private'}</span>
              </div>
              <div className="board-body">
                <h3>{b.title}</h3>
                <p>{b.description}</p>
                <div className="board-foot">
                  <span>{b.nodeIds.length} nodes · {app.connections.filter((c) => c.boardId === b.id).length} links</span>
                  <span>{timeAgo(b.updatedAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
        {boards.length === 0 && <p className="dash-empty hand">nothing pinned here yet — try another search…</p>}
      </main>
    </div>
  );
}

function MiniPreview({ nodes }) {
  return (
    <div className="mini">
      {nodes.slice(0, 5).map((n, i) => (
        <span key={n.id} className={`mini-node t-${n.type}`} style={{ left: `${8 + i * 17}%`, top: `${14 + ((i * 37) % 52)}%` }} />
      ))}
    </div>
  );
}
