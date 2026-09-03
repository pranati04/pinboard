import { useState } from 'react';

export default function Comments({ comments, nodeId, userName, onAdd, onDelete }) {
  const [draft, setDraft] = useState('');
  const list = comments.filter((c) => (c.nodeId || null) === (nodeId || null));

  const submit = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAdd({ nodeId: nodeId || null, content: text });
    setDraft('');
  };

  return (
    <div className="comments">
      {list.length === 0 && <p className="props-empty">{nodeId ? 'No notes on this card yet.' : 'No board comments yet — start the discussion.'}</p>}
      {list.map((c) => (
        <div className="comment" key={c.id}>
          <div className="comment-head">
            <span className="comment-avatar">{c.author[0].toUpperCase()}</span>
            <span className="comment-author">{c.author}</span>
            <button className="comment-del" onClick={() => onDelete(c.id)} title="Delete comment">✕</button>
          </div>
          <p>{c.content}</p>
        </div>
      ))}
      <form className="comment-form" onSubmit={submit}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={nodeId ? 'Comment on this card…' : 'Comment on the board…'} maxLength={280} />
        <button className="btn solid sm" type="submit">Post</button>
      </form>
      <p className="auth-foot hand" style={{ fontSize: 17 }}>signed as {userName}</p>
    </div>
  );
}
