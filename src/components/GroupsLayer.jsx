export default function GroupsLayer({ groups, boardId, posOf }) {
  const list = groups.filter((g) => g.boardId === boardId);
  return (
    <>
      {list.map((g) => (
        <div
          key={g.id}
          className="group-box"
          style={{ left: g.x, top: g.y, width: g.w, height: g.h }}
          title={g.description || g.name}
        >
          <span className="group-label">{g.name}</span>
        </div>
      ))}
    </>
  );
}
