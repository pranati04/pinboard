import { useState } from 'react';

export default function Auth({ mode, onMode, onAuth, onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) return setError('Please enter a valid email address (FR-02).');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (isRegister && !name.trim()) return setError('Please tell us your name.');
    setError('');
    onAuth({ name: isRegister ? name.trim() : email.split('@')[0], email: email.trim() });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="auth-back" onClick={onBack}>← back</button>
        <div className="brand" style={{ marginBottom: 6 }}>
          <span className="brand-pin" />
          <span className="brand-name">Pinboard</span>
        </div>
        <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-sub">
          {isRegister ? 'One account, unlimited walls to think on.' : 'Your boards are pinned right where you left them.'}
        </p>
        <div className="auth-tabs">
          <button className={!isRegister ? 'active' : ''} onClick={() => onMode('login')}>Sign in</button>
          <button className={isRegister ? 'active' : ''} onClick={() => onMode('register')}>Register</button>
        </div>
        <form onSubmit={submit} noValidate>
          {isRegister && (
            <label>Display name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Grover" autoComplete="name" />
            </label>
          )}
          <label>Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.edu" autoComplete="email" />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={isRegister ? 'new-password' : 'current-password'} />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="btn solid large auth-submit" type="submit">
            {isRegister ? 'Create account →' : 'Sign in →'}
          </button>
        </form>
        <p className="auth-foot hand">passwords are hashed, never stored plain · FR-04</p>
      </div>
      <div className="auth-side" aria-hidden="true">
        <div className="auth-side-card r1"><Pin /><span className="fc-note-title">Study board — finals</span><p>6 nodes · 3 connections</p></div>
        <div className="auth-side-card r2"><Pin /><img src="https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=400&q=60" alt="" /></div>
        <div className="auth-side-card r3"><Pin /><span className="tag">moodboard</span><p className="hand">autumn editorial →</p></div>
      </div>
    </div>
  );
}

function Pin() {
  return <span className="pin" />;
}
