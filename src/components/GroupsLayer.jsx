export default function GroupsLayer({ groups, boardId, onMoveDown, onResizeDown, onDelete }) {
  const list = groups.filter((g) => g.boardId === boardId);
  return (
    <>
      {list.map((g) => (
        <div
          key={g.id}
          className="group-box"
          style={{ left: g.x, top: g.y, width: g.w, height: g.h }}
          title={g.description || g.name}
          onPointerDown={(event) => {
            if (event.target.closest('button')) return;
            onMoveDown?.(event, g);
          }}
        >
          <span className="group-label">
            <span>{g.name}</span>
            <button type="button" className="group-delete" aria-label={`Delete ${g.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete?.(g.id)}>×</button>
          </span>
          <button type="button" className="group-resize-handle" aria-label={`Resize ${g.name}`} onPointerDown={(event) => onResizeDown?.(event, g)} />
        </div>
      ))}
    </>
  );
}
