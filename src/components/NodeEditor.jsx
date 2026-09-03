const COLORS = [
  { id: 'cream', label: 'Paper' },
  { id: 'butter', label: 'Butter' },
  { id: 'blush', label: 'Blush' },
  { id: 'sky', label: 'Mist' },
];

export default function NodeEditor({ node, onChange, onDelete, onDuplicate }) {
  const set = (patch) => onChange(node.id, patch);
  const tagsText = (node.tags || []).join(', ');

  return (
    <div className="editor">
      <div className="editor-row">
        <span className={`node-badge t-${node.type}`}>{node.type}</span>
        <span className="editor-id">#{node.id}</span>
      </div>
      <label className="editor-field">Title
        <input value={node.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} />
      </label>
      <label className="editor-field">{node.type === 'text' ? 'Content' : node.type === 'link' || node.type === 'image' || node.type === 'video' ? 'URL' : 'Details'}
        {node.type === 'text' ? (
          <textarea value={node.content} onChange={(e) => set({ content: e.target.value })} rows={4} />
        ) : (
          <input value={node.content} onChange={(e) => set({ content: e.target.value })} />
        )}
      </label>
      <label className="editor-field">Tags <em>comma separated</em>
        <input
          value={tagsText}
          onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean) })}
          placeholder="thesis, todo"
        />
      </label>
      <div className="editor-field">Card colour
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c.id}
              title={c.label}
              className={`swatch color-${c.id} ${(node.color || 'cream') === c.id ? 'on' : ''}`}
              onClick={() => set({ color: c.id })}
            />
          ))}
        </div>
      </div>
      <div className="editor-actions">
        <button className="btn ghost sm" onClick={() => onDuplicate(node.id)}>⧉ Duplicate</button>
        <button className="btn danger sm" onClick={() => onDelete(node.id)}>Delete</button>
      </div>
    </div>
  );
}
