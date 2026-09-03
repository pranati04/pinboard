import CanvasFrame from './CanvasFrame.jsx';

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

export default function BoardCanvas({ board, nodes }) {
  return (
    <CanvasFrame>
      <div className="canvas-world" style={{ background: BG[board.background] || BG.cork }}>
        <div className="canvas-texture" style={{ backgroundImage: TEXTURES[board.background] || TEXTURES.cork }} />
        {nodes.map((n) => (
          <div key={n.id} className="node-shell" style={{ left: n.x, top: n.y, width: n.w }}>
            <span className="pin" />
            <span className="node-shell-title">{n.title}</span>
            <span className="node-shell-type">{n.type}</span>
          </div>
        ))}
      </div>
    </CanvasFrame>
  );
}
