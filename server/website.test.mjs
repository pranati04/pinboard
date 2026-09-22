import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const php = process.env.PHP_BINARY || (process.platform === 'win32' ? 'C:/xampp/php/php.exe' : 'php');
const env = { ...process.env, DB_NAME: 'pinboard_test' };
const phpRun = (code, args = [], overrides = {}) => execFileSync(php, ['-r', code, ...args], {
  cwd, env: { ...env, ...overrides }, encoding: 'utf8',
});

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function stop(server) {
  if (server.exitCode !== null) return;
  const exited = once(server, 'exit');
  server.kill();
  await exited;
}

async function start(port) {
  const server = spawn(php, ['-S', `127.0.0.1:${port}`, '-t', `${cwd}/dist`, `${cwd}/server/router.php`], {
    cwd, env, stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/me`);
      if (response.ok) return server;
      throw new Error(await response.text());
    } catch (error) {
      if (server.exitCode !== null || attempt === 59) { await stop(server); throw error; }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

const dbDocument = (id) => JSON.parse(phpRun("require 'server/db.php'; echo json_encode(get_board_doc($argv[1]));", [id]));

async function api(base, path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

async function signIn(page, email, password) {
  await page.locator('#view-landing [data-go="login"]').first().click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('[data-form] button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: 'Your walls' })).toBeVisible();
}

async function openTestBoard(page, id) {
  await page.locator(`[data-board="${id}"] [data-open]`).click();
  await expect(page.locator('.board-view')).toBeVisible();
  await page.locator('.node').first().click();
}

test('manual schema, browser saves, account isolation, profile and confirmed board deletion', { timeout: 120000 }, async (t) => {
  phpRun(`$c = require 'server/config.php';
    $p = new PDO("mysql:host={$c['host']};port={$c['port']};charset=utf8mb4", $c['user'], $c['pass']);
    $p->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $p->exec('CREATE DATABASE IF NOT EXISTS pinboard_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $p->exec('USE pinboard_test');
    $p->exec(file_get_contents('server/schema.sql'));`);
  const missing = `pinboard_missing_${Date.now()}`;
  assert.equal(phpRun("require 'server/db.php'; try { pdo(); echo 'unexpected'; } catch (PDOException $e) { echo $e->errorInfo[1]; }", [], { DB_NAME: missing }).trim(), '1049');

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  let server = await start(port);
  t.after(() => stop(server));
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium') });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  t.after(() => browser.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
  await Promise.all([page.waitForResponse(`${base}/api/me`), page.goto(base)]);
  await page.locator('#view-landing [data-go="login"]').first().click();
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  const email = `test-${Date.now()}@example.invalid`;
  const password = `Test-${crypto.randomUUID()}`;
  await page.getByLabel('Display name', { exact: true }).fill('Persistence Tester');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.locator('[data-form] button[type="submit"]').click();
  await expect(page.getByRole('heading', { name: 'Your walls' })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('pb_token'));
  await page.locator('[data-new]').click();
  const created = page.waitForResponse((response) => response.url() === `${base}/api/boards` && response.request().method() === 'POST');
  await page.locator('[data-blank]').click();
  const board = await (await created).json();
  const id = board.id;
  await expect(page.locator('.board-view')).toBeVisible();
  await page.getByRole('button', { name: 'Edit board details', exact: true }).click();
  await page.getByLabel('Board name', { exact: true }).fill('Renamed workspace');
  const description = 'Research notes & ideas\nA shared direction for the project.';
  await page.getByLabel('Description', { exact: true }).fill(description);
  await page.getByRole('button', { name: 'Save details', exact: true }).click();
  assert.equal((await api(base, `/api/boards/${id}`, { token })).data.board.description, description);
  assert.equal((await api(base, `/api/boards/${id}`, { method: 'PATCH', token, body: { description: 'x'.repeat(2001) } })).status, 400);
  assert.equal((await api(base, `/api/boards/${id}`, { method: 'PATCH', token, body: { description: [] } })).status, 400);
  assert.equal((await api(base, `/api/boards/${id}`, { method: 'PATCH', body: { description: 'Not mine' } })).status, 404);
  assert.equal((await api(base, `/api/boards/${id}`, { token })).data.board.description, description);
  await expect(page.locator('.board-title h1')).toHaveText('Renamed workspace');
  assert.equal((await api(base, `/api/boards/${id}`, { token })).data.board.title, 'Renamed workspace');
  assert.equal((await api(base, `/api/boards/${id}`, { method: 'PATCH', token, body: { title: '   ' } })).status, 400);
  assert.equal((await api(base, `/api/boards/${id}`, { method: 'PATCH', body: { title: 'Not mine' } })).status, 404);
  await page.getByTitle('Text note', { exact: true }).click();
  await page.locator('.canvas-scroll').click({ position: { x: 300, y: 200 } });
  await page.getByLabel('Title', { exact: true }).fill('A persisted note');
  await page.locator('.editor textarea').fill('Saved explicitly to MySQL');
  await page.getByRole('button', { name: 'Save board', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('Saved to database');
  assert.equal(dbDocument(id).nodes[0].content, 'Saved explicitly to MySQL');

  await page.locator('.editor textarea').fill('Saved when leaving immediately');
  await page.getByRole('button', { name: 'Boards', exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'Your walls' })).toBeVisible();
  assert.equal(dbDocument(id).nodes[0].content, 'Saved when leaving immediately');
  await expect(page.locator(`[data-board="${id}"] .board-body p`)).toHaveText(description);
  await page.locator(`[data-board="${id}"] [data-rename]`).click();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue(description);
  await page.getByLabel('Board name', { exact: true }).fill('Cancelled title');
  await page.getByLabel('Description', { exact: true }).fill('Cancelled description');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator(`[data-board="${id}"] h3`)).toHaveText('Renamed workspace');
  await expect(page.locator(`[data-board="${id}"] .board-body p`)).toHaveText(description);
  await page.locator(`[data-board="${id}"] [data-rename]`).click();
  await page.getByLabel('Description', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(page.locator(`[data-board="${id}"] .board-body p`)).toHaveText('');
  assert.equal((await api(base, `/api/boards/${id}`, { token })).data.board.description, '');
  await page.locator(`[data-board="${id}"] [data-rename]`).click();
  await page.getByLabel('Board name', { exact: true }).fill('Dashboard renamed board');
  await page.getByLabel('Description', { exact: true }).fill(description);
  await page.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(page.locator(`[data-board="${id}"] h3`)).toHaveText('Dashboard renamed board');
  await page.locator('[data-search]').fill('shared direction');
  await expect(page.locator('[data-board]')).toHaveCount(1);
  await expect(page.locator(`[data-board="${id}"]`)).toBeVisible();
  await page.locator('[data-search]').fill('');
  await openTestBoard(page, id);
  await expect(page.locator('.board-title h1')).toHaveText('Dashboard renamed board');
  await expect(page.locator('.editor textarea')).toHaveValue('Saved when leaving immediately');

  const failSave = (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Simulated database outage' }) });
  await page.route('**/api/boards/*/state', failSave);
  await page.locator('.editor textarea').fill('Retained during outage');
  await page.getByRole('button', { name: 'Save board', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('Save failed');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Boards', exact: false }).first().click();
  await expect(page.locator('.board-view')).toBeVisible();
  await expect(page.locator('.editor textarea')).toHaveValue('Retained during outage');
  await page.unroute('**/api/boards/*/state', failSave);
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('Saved to database');
  assert.equal(dbDocument(id).nodes[0].content, 'Retained during outage');

  await page.getByRole('button', { name: 'Boards', exact: false }).first().click();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  assert.equal((await api(base, `/api/boards/${id}`, { token })).status, 401);
  await signIn(page, email, password);
  await openTestBoard(page, id);
  await expect(page.locator('.editor textarea')).toHaveValue('Retained during outage');

  await stop(server);
  server = await start(port);
  await Promise.all([page.waitForResponse(`${base}/api/me`), page.reload()]);
  await page.locator('#view-landing [data-go="dashboard"]').first().click();
  await openTestBoard(page, id);
  await expect(page.locator('.editor textarea')).toHaveValue('Retained during outage');
  let freshToken = await page.evaluate(() => localStorage.getItem('pb_token'));
  await page.getByRole('button', { name: 'Edit board details', exact: true }).click();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue(description);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal((await api(base, `/api/boards/${id}`, { token: freshToken })).data.board.description, description);
  const before = dbDocument(id);
  assert.equal((await api(base, `/api/boards/${id}/state`, { method: 'PUT', token: freshToken, body: { nodes: [] } })).status, 422);
  assert.deepEqual(dbDocument(id), before);
  assert.equal((await api(base, `/api/boards/${id}`, { method: 'DELETE' })).status, 404);
  assert.deepEqual(dbDocument(id), before);

  await page.getByRole('button', { name: 'Boards', exact: false }).first().click();
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.getByText(email, { exact: false })).toBeVisible();
  await page.getByLabel('Display name', { exact: true }).fill('Updated Profile');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Profile saved to the database.', { exact: true })).toBeVisible();
  assert.equal((await api(base, '/api/me', { token: freshToken })).data.user.name, 'Updated Profile');
  assert.equal((await api(base, '/api/me', { method: 'PATCH', token: freshToken, body: { email: 'invalid' } })).status, 400);
  assert.equal((await api(base, '/api/me', { method: 'PATCH', token: freshToken, body: { name: 'Should not change', email: 'guest@pinboard.local', currentPassword: password } })).status, 409);
  assert.equal((await api(base, '/api/me', { token: freshToken })).data.user.name, 'Updated Profile');
  const otherSession = (await api(base, '/api/auth/login', { method: 'POST', body: { email, password } })).data.token;
  const newEmail = `updated-${Date.now()}@example.invalid`;
  const newPassword = `Changed-${crypto.randomUUID()}`;
  await page.getByLabel('Email address', { exact: true }).fill(newEmail);
  await page.getByLabel('Current password', { exact: true }).fill('incorrect-password');
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password', { exact: true }).fill('does-not-match');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('The new passwords do not match.', { exact: true })).toBeVisible();
  await page.getByLabel('Confirm new password', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Current password is incorrect.', { exact: true })).toBeVisible();
  assert.equal((await api(base, '/api/me', { token: freshToken })).data.user.email, email);
  await page.getByLabel('Current password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Profile saved to the database.', { exact: true })).toBeVisible();
  assert.equal((await api(base, '/api/me', { token: freshToken })).data.user.email, newEmail);
  assert.equal((await api(base, '/api/me', { token: otherSession })).status, 401);
  assert.equal((await api(base, '/api/auth/login', { method: 'POST', body: { email, password } })).status, 401);
  assert.equal((await api(base, '/api/auth/login', { method: 'POST', body: { email: newEmail, password } })).status, 401);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await signIn(page, newEmail, newPassword);
  freshToken = await page.evaluate(() => localStorage.getItem('pb_token'));
  await page.getByRole('button', { name: 'My profile', exact: true }).click();
  await expect(page.getByLabel('Display name', { exact: true })).toHaveValue('Updated Profile');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(newEmail);
  await page.getByRole('button', { name: 'Manage all boards', exact: true }).click();
  const fullDoc = dbDocument(id);
  fullDoc.nodes.push({ ...fullDoc.nodes[0], id: 'second-node', title: 'Second node', x: 500 });
  fullDoc.connections = [{ id: 'edge-test', from: fullDoc.nodes[0].id, to: 'second-node', label: 'User-defined relationship' }];
  fullDoc.groups = [{ id: 'group-test', name: 'Persisted group', x: 0, y: 0, w: 600, h: 400 }];
  fullDoc.comments = [{ id: 'comment-test', nodeId: null, author: 'Updated Profile', content: 'Persisted comment', createdAt: Date.now() }];
  assert.equal((await api(base, `/api/boards/${id}/state`, { method: 'PUT', token: freshToken, body: fullDoc })).status, 200);
  await openTestBoard(page, id);
  await page.locator('.editor textarea').fill('All board content survives');
  await page.getByRole('button', { name: 'Save board', exact: true }).click();
  await expect(page.locator('.save-status')).toHaveText('Saved to database');
  const complete = dbDocument(id);
  assert.equal(complete.nodes.length, 2);
  assert.equal(complete.connections[0].label, 'User-defined relationship');
  assert.equal(complete.groups[0].name, 'Persisted group');
  assert.equal(complete.comments[0].content, 'Persisted comment');
  await page.getByRole('button', { name: 'Boards', exact: false }).first().click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator(`[data-board="${id}"] [data-delete]`).click();
  await expect(page.locator(`[data-board="${id}"]`)).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator(`[data-board="${id}"] [data-delete]`).click();
  await expect(page.locator(`[data-board="${id}"]`)).toHaveCount(0);
  assert.equal((await api(base, `/api/boards/${id}`, { token: freshToken })).status, 404);
  assert.deepEqual(dbDocument(id), { nodes: [], connections: [], groups: [], comments: [] });
  assert.deepEqual(errors, []);
});
