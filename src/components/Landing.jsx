import { useReveal } from '../hooks/useParallax.js';
import { HeroArt } from './HeroArt.jsx';

const features = [
  { icon: '◈', title: 'Mixed media nodes', text: 'Text, images, video, links, files and audio live side by side on one board.' },
  { icon: '⟡', title: 'Thought connections', text: 'Draw labelled relationships — Supports, Causes, Depends on — between any two nodes.' },
  { icon: '⬔', title: 'Groups & tags', text: 'Cluster related ideas into groups, tag anything, then filter the board in one click.' },
  { icon: '◎', title: 'Infinite canvas', text: 'Pan and zoom across a generous workspace with buttery drag physics.' },
  { icon: '⬣', title: 'Share with control', text: 'Private by default. Invite collaborators as viewers or editors, or publish a link.' },
  { icon: '✎', title: 'Comment anywhere', text: 'Discuss the whole board or annotate a single node without leaving context.' },
];

const steps = [
  { n: '01', title: 'Create a board', text: 'Name it, pick a backdrop — cork, linen or sage — and start with a blank canvas.' },
  { n: '02', title: 'Pin anything', text: 'Drop notes, images, links and files. Arrange them the way your mind works.' },
  { n: '03', title: 'Connect the dots', text: 'Link nodes with labelled connections and watch the argument take shape.' },
];

export default function Landing({ onEnter }) {
  const ref = useReveal();
  return (
    <div className="landing" ref={ref}>
      <header className="nav">
        <div className="brand">
          <span className="brand-pin" />
          <span className="brand-name">Pinboard</span>
        </div>
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#boards">Boards</a>
        </nav>
        <div className="nav-cta">
          <button className="btn ghost" onClick={() => onEnter('login')}>Sign in</button>
          <button className="btn solid" onClick={() => onEnter('dashboard')}>Open studio →</button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Online visual corkboard · SRS §1</p>
          <h1>Think on a wall,<br />not in a list.</h1>
          <p className="lede">
            Pinboard is a visual workspace for collecting, organizing and connecting
            ideas — notes, images, links and files arranged freely, tied together
            with labelled relationships.
          </p>
          <div className="hero-cta">
            <button className="btn solid large" onClick={() => onEnter('dashboard')}>Start a board</button>
            <button className="btn outline large" onClick={() => onEnter('login')}>Sign in</button>
          </div>
          <div className="hero-meta">
            <span>✦ Free-form canvas</span><span>✦ Labelled links</span><span>✦ Private by default</span>
          </div>
        </div>
        <HeroArt />
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['brainstorming', 'research', 'study boards', 'moodboards', 'project planning', 'story mapping'].map((w, i) => (
              <span key={`${k}-${i}`}>{w} <i>✦</i></span>
            ))
          )}
        </div>
      </div>

      <section className="section" id="features">
        <p className="eyebrow reveal">Capabilities · SRS §2–3</p>
        <h2 className="reveal">Everything a physical corkboard wishes it could do</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <article className="feature-card reveal" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section how" id="how">
        <p className="eyebrow reveal">Workflow · SRS §10</p>
        <h2 className="reveal">From blank wall to shared thinking in three moves</h2>
        <div className="steps">
          {steps.map((s) => (
            <div className="step reveal" key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band reveal" id="boards">
        <div>
          <h2>Your next idea deserves a wall.</h2>
          <p>Open the studio and pin your first board — no setup, just a canvas.</p>
        </div>
        <button className="btn cream large" onClick={() => onEnter('dashboard')}>Open the studio →</button>
      </section>

      <footer className="footer">
        <span>Pinboard — Online Visual Corkboard & Thought-Mapping System</span>
        <span className="hand">pinned with care · MCA 2026</span>
      </footer>
    </div>
  );
}
