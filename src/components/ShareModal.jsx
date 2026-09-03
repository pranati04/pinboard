import { useState } from 'react';

export default function ShareModal({ board, onClose }) {
  const [isPublic, setIsPublic] = useState(board.isPublic);
  const [rows, setRows] = useState([
    { email: 'aanya@studio.edu', role: 'editor' },
    { email: 'pranati@studio.edu', role: 'viewer' },
  ]);
  const [invite, setInvite] = useState('');
  const [copied, setCopied] = useState(false);
  const link = `https://pinboard.app/b/${board.id}`;

  const addInvite = (e) => {
    e.preventDefault();
    const email = invite.trim();
    if (!email.includes('@')) return;
    if (rows.some((r) => r.email === email)) return setInvite('');
    setRows((r) => [...r, { email, role: 'viewer' }]);
    setInvite('');
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">Sharing · SRS §3.11</p>
            <h2>Share “{board.title}”</h2>
          </div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>

        <form className="invite-row" onSubmit={addInvite}>
          <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="teammate@studio.edu" />
          <button className="btn solid sm" type="submit">Invite</button>
        </form>

        <div className="collab-list">
          {rows.map((r) => (
            <div className="collab-row" key={r.email}>
              <span className="dash-avatar">{r.email[0].toUpperCase()}</span>
              <span className="collab-email">{r.email}</span>
              <select value={r.role} onChange={(e) => setRows((all) => all.map((x) => x.email === r.email ? { ...x, role: e.target.value } : x))}>
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
              <button className="comment-del" onClick={() => setRows((all) => all.filter((x) => x.email !== r.email))} title="Revoke access">✕</button>
            </div>
          ))}
        </div>

        <div className="public-row">
          <div>
            <strong>Public link</strong>
            <p>Anyone with the link can view this board.</p>
          </div>
          <button className={`toggle ${isPublic ? 'on' : ''}`} onClick={() => setIsPublic(!isPublic)} aria-pressed={isPublic}>
            <span />
          </button>
        </div>
        {isPublic && (
          <div className="link-row">
            <code>{link}</code>
            <button className="btn outline sm" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
