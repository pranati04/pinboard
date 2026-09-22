import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoardSaver } from './boardSaver.js';

const pause = () => new Promise((resolve) => setTimeout(resolve, 20));

test('flush saves the latest snapshot before navigation, without waiting for debounce', async () => {
  const writes = [];
  const saver = createBoardSaver({ initial: { nodes: [] }, save: async (doc) => writes.push(doc), delay: 10000 });
  saver.update({ nodes: [{ id: 'new', content: 'persist me' }] });
  assert.equal(saver.isDirty(), true);
  await saver.flush();
  assert.equal(writes[0].nodes[0].content, 'persist me');
  assert.equal(saver.isDirty(), false);
  saver.cancelTimer();
});

test('saves are serialized and edits made during a request are also persisted', async () => {
  const writes = [];
  let release;
  const saver = createBoardSaver({ initial: 0, delay: 10000, save: async (doc) => {
    writes.push(doc);
    if (writes.length === 1) await new Promise((resolve) => { release = resolve; });
  } });
  saver.update(1);
  const first = saver.flush();
  await Promise.resolve();
  saver.update(2);
  const second = saver.flush();
  assert.deepEqual(writes, [1]);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(writes, [1, 2]);
  assert.equal(saver.isDirty(), false);
});

test('failed saves stay dirty, block navigation and can be retried', async () => {
  let fail = true;
  const statuses = [];
  const saver = createBoardSaver({ initial: 0, delay: 10000, save: async () => {
    if (fail) throw new Error('MySQL unavailable');
  } });
  saver.subscribe((status) => statuses.push(status));
  saver.update(1);
  await assert.rejects(saver.flush(), /MySQL unavailable/);
  assert.equal(saver.isDirty(), true);
  assert.equal(statuses.at(-1).state, 'error');
  fail = false;
  await saver.flush();
  assert.equal(saver.isDirty(), false);
  assert.equal(statuses.at(-1).state, 'saved');
});

test('unchanged initial data never overwrites the database', async () => {
  let writes = 0;
  const saver = createBoardSaver({ initial: { nodes: [] }, delay: 1, save: async () => { writes++; } });
  saver.update({ nodes: [] });
  await saver.flush();
  await pause();
  assert.equal(writes, 0);
});

test('autosave sends changes, and unrelated renders do not postpone it', async () => {
  const writes = [];
  const saver = createBoardSaver({ initial: 0, delay: 1, save: async (doc) => writes.push(doc) });
  saver.update(1);
  saver.update(1);
  await pause();
  assert.deepEqual(writes, [1]);
});

test('reverting while a save is in flight still writes the reverted state', async () => {
  const writes = [];
  let release;
  const saver = createBoardSaver({ initial: 0, delay: 10000, save: async (doc) => {
    writes.push(doc);
    if (writes.length === 1) await new Promise((resolve) => { release = resolve; });
  } });
  saver.update(1);
  const pending = saver.flush();
  await Promise.resolve();
  saver.update(0);
  assert.equal(saver.isDirty(), true);
  release();
  await pending;
  assert.deepEqual(writes, [1, 0]);
  assert.equal(saver.isDirty(), false);
});
