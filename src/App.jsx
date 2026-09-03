import { useAppState } from './store/boardStore.js';

export default function App() {
  const app = useAppState();
  return (
    <div style={{ padding: 48, fontFamily: 'var(--font-body)' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>Pinboard</p>
      <p style={{ color: 'var(--ink-faint)' }}>Scaffold ready — landing, auth, dashboard and board views land in the next commits.</p>
      <p style={{ marginTop: 12, fontSize: 13 }}>view: {app.view.name}</p>
    </div>
  );
}
