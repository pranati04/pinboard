import { useMemo } from 'react';

export default function CanvasFrame({ children, texture }) {
  const style = useMemo(() => ({ '--tex': texture }), [texture]);
  return (
    <div className="canvas-scroll" style={style}>
      {children}
    </div>
  );
}
