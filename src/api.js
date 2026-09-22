const TOKEN_KEY = 'pb_token';
const storage = (() => {
  try { return typeof window !== 'undefined' ? window.localStorage : null; }
  catch { return null; }
})();
let token = storage?.getItem(TOKEN_KEY) || null;

function requestSignal(timeoutMs) {
  if (typeof AbortController === 'undefined') return undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

async function req(method, path, body) {
  const timeout = requestSignal(15000);
  let res;
  try {
    res = await fetch(path, {
      method,
      cache: 'no-store',
      ...(timeout ? { signal: timeout.signal } : {}),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } finally {
    timeout?.clear();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `Request failed (${res.status}). Check that PHP and MySQL are running.`);
    error.status = res.status;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  setToken(t) {
    token = t;
    if (!storage) return;
    if (t) storage.setItem(TOKEN_KEY, t);
    else storage.removeItem(TOKEN_KEY);
  },
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  put: (p, b) => req('PUT', p, b),
  patch: (p, b) => req('PATCH', p, b),
  del: (p) => req('DELETE', p),
};
