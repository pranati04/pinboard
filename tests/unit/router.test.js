import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathForView, viewForPath } from '../../src/router.js';

test('maps views to stable application URLs', () => {
  assert.equal(pathForView({ name: 'landing' }), '/');
  assert.equal(pathForView({ name: 'dashboard' }), '/dashboard');
  assert.equal(pathForView({ name: 'board', boardId: 'board one' }), '/boards/board%20one');
});

test('parses page URLs into views', () => {
  assert.deepEqual(viewForPath('/login'), { name: 'login' });
  assert.deepEqual(viewForPath('/profile/'), { name: 'profile' });
  assert.deepEqual(viewForPath('/boards/board%20one'), { name: 'board', boardId: 'board one' });
  assert.deepEqual(viewForPath('/unknown'), { name: 'landing' });
});
