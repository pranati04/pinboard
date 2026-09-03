import { useParallax } from '../hooks/useParallax.js';

function Pin({ style }) {
  return <span className="pin" style={style} />;
}

function FloatCard({ className, rotate, children, depth }) {
  return (
    <div className={`float-card ${className}`} style={{ '--rot': `${rotate}deg`, '--depth': depth }}>
      <Pin />
      {children}
    </div>
  );
}

export function HeroArt() {
  const back = useParallax(0.12);
  const mid = useParallax(0.22);
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-art-layer" ref={back}>
        <FloatCard className="fc-a" rotate={-6} depth="1">
          <img src="https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=500&q=60" alt="" />
          <span className="hand">ochre study</span>
        </FloatCard>
        <FloatCard className="fc-b" rotate={5} depth="1">
          <span className="fc-note-title">Core claim</span>
          <p>Spatial arrangement improves recall.</p>
          <span className="tag">thesis</span>
        </FloatCard>
      </div>
      <div className="hero-art-layer" ref={mid}>
        <FloatCard className="fc-c" rotate={-3} depth="2">
          <img src="https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=500&q=60" alt="" />
          <span className="hand">linen texture</span>
        </FloatCard>
        <FloatCard className="fc-d" rotate={4} depth="2">
          <span className="fc-link">↗ cognitive-maps.pdf</span>
          <svg viewBox="0 0 120 40" className="fc-wire"><path d="M4 34 C 40 34, 60 6, 116 6" fill="none" strokeWidth="2" strokeDasharray="5 4" /><circle cx="116" cy="6" r="3.5" /></svg>
          <span className="fc-wire-label">Supports</span>
        </FloatCard>
      </div>
    </div>
  );
}
