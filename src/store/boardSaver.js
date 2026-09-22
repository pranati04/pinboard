export function createBoardSaver({ initial, save, delay = 700 }) {
  let latest = JSON.stringify(initial);
  let persisted = latest;
  let timer = null;
  let running = null;
  let status = { state: 'saved', error: '' };
  const listeners = new Set();
  const publish = (state, error = '') => {
    status = { state, error };
    listeners.forEach((listener) => listener(status));
  };
  const cancelTimer = () => { clearTimeout(timer); timer = null; };

  async function flush() {
    cancelTimer();
    if (running) {
      await running;
      if (latest !== persisted) return flush();
      return;
    }
    if (latest === persisted) { publish('saved'); return; }
    publish('saving');
    running = Promise.resolve().then(async () => {
      while (latest !== persisted) {
        const snapshot = latest;
        await save(JSON.parse(snapshot));
        persisted = snapshot;
      }
      cancelTimer();
      publish('saved');
    }).catch((error) => {
      cancelTimer();
      publish('error', error.message || 'Unable to save. Please retry.');
      throw error;
    }).finally(() => { running = null; });
    await running;
  }

  return {
    update(doc) {
      const json = JSON.stringify(doc);
      if (json === latest && (timer || running || json === persisted)) return;
      latest = json;
      cancelTimer();
      if (!running) publish(latest === persisted ? 'saved' : 'unsaved');
      if (latest !== persisted) timer = setTimeout(() => { flush().catch(() => {}); }, delay);
    },
    flush,
    cancelTimer,
    isDirty: () => Boolean(running) || latest !== persisted,
    subscribe(listener) {
      listeners.add(listener);
      listener(status);
      return () => listeners.delete(listener);
    },
  };
}
