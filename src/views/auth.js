import { setView, login, register } from '../store/appStore.js';
import { esc } from './dom.js';

const draft = { name: '', email: '', password: '' };

export function renderAuth(el, mode) {
  const isRegister = mode === 'register';

  el.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <button class="auth-back" data-back>← back</button>
        <div class="brand" style="margin-bottom: 6px">
          <span class="brand-pin"></span>
          <span class="brand-name">Pinboard</span>
        </div>
        <h1>${isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p class="auth-sub">
          ${isRegister ? 'One account, unlimited walls to think on.' : 'Your boards are pinned right where you left them.'}
        </p>
        <div class="auth-tabs">
          <button data-mode="login" class="${!isRegister ? 'active' : ''}">Sign in</button>
          <button data-mode="register" class="${isRegister ? 'active' : ''}">Register</button>
        </div>
        <form data-form novalidate>
          ${isRegister ? `
          <label>Display name
            <input name="name" value="${esc(draft.name)}" placeholder="Aanya Grover" autocomplete="name" />
          </label>` : ''}
          <label>Email
            <input name="email" value="${esc(draft.email)}" placeholder="you@studio.edu" autocomplete="email" />
          </label>
          <label>Password
            <input name="password" type="password" value="${esc(draft.password)}" placeholder="••••••••" autocomplete="${isRegister ? 'new-password' : 'current-password'}" />
          </label>
          <p class="auth-error" data-error hidden></p>
          <button class="btn solid large auth-submit" type="submit">
            ${isRegister ? 'Create account →' : 'Sign in →'}
          </button>
        </form>
        <p class="auth-foot hand">passwords are hashed, never stored plain · FR-04</p>
      </div>
      <div class="auth-side" aria-hidden="true">
        <div class="auth-side-card r1"><span class="pin"></span><span class="fc-note-title">Study board — finals</span><p>6 nodes · 3 connections</p></div>
        <div class="auth-side-card r2"><span class="pin"></span><img src="https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=400&q=60" alt="" /></div>
        <div class="auth-side-card r3"><span class="pin"></span><span class="tag">moodboard</span><p class="hand">autumn editorial →</p></div>
      </div>
    </div>`;

  el.querySelector('[data-back]').addEventListener('click', () => setView({ name: 'landing' }));
  el.querySelectorAll('[data-mode]').forEach((tab) => {
    tab.addEventListener('click', () => setView({ name: tab.dataset.mode }));
  });

  const form = el.querySelector('[data-form]');
  const errorEl = el.querySelector('[data-error]');
  form.addEventListener('input', () => {
    draft.name = form.elements.name?.value || draft.name;
    draft.email = form.elements.email?.value || draft.email;
    draft.password = form.elements.password?.value || draft.password;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (form.elements.name?.value || '').trim();
    const email = (form.elements.email?.value || '').trim();
    const password = form.elements.password?.value || '';
    draft.name = name; draft.email = email; draft.password = password;

    const fail = (msg) => { errorEl.textContent = msg; errorEl.hidden = false; };
    if (!email.includes('@')) return fail('Please enter a valid email address (FR-02).');
    if (password.length < 6) return fail('Password must be at least 6 characters.');
    if (isRegister && !name) return fail('Please tell us your name.');

    const btn = form.querySelector('.auth-submit');
    btn.disabled = true;
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
      errorEl.hidden = true;
      setView({ name: 'dashboard' });
    } catch (err2) {
      fail(err2.message);
      btn.disabled = false;
    }
  });
}
