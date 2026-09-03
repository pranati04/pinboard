import { useAppState } from './store/boardStore.js';
import Landing from './components/Landing.jsx';
import Auth from './components/Auth.jsx';
import './styles/landing.css';
import './styles/auth.css';

export default function App() {
  const app = useAppState();
  const go = (name) => app.setView({ name });

  if (app.view.name === 'landing' || !app.view.name) {
    return <Landing onEnter={go} />;
  }
  if (app.view.name === 'login' || app.view.name === 'register') {
    return (
      <Auth
        mode={app.view.name}
        onMode={go}
        onBack={() => go('landing')}
        onAuth={(u) => { app.setUser(u); go('dashboard'); }}
      />
    );
  }
  return (
    <div style={{ padding: 48, fontFamily: 'var(--font-body)' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>Pinboard</p>
      <p style={{ color: 'var(--ink-faint)' }}>“{app.view.name}” view lands in an upcoming commit.</p>
      <button className="btn outline" style={{ marginTop: 16 }} onClick={() => go('landing')}>← Back to landing</button>
    </div>
  );
}
