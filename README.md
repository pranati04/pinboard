# Corkboard

Corkboard is a Vite frontend with a PHP JSON API and MySQL persistence.

## Requirements

- Node.js 18+
- XAMPP (PHP and MySQL)
- Playwright's browser runtime for end-to-end tests

## First-time database setup

1. Start MySQL from XAMPP.
2. Create a database named `pinboard` in phpMyAdmin.
3. Import [`server/schema.sql`](server/schema.sql).

The default connection is `127.0.0.1:3306`, user `root`, with an empty password. Override it with `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, and `APP_ORIGINS` if needed.

For an existing development database, back it up before importing the updated schema. The current schema adds board versions and foreign keys; recreating a disposable database is the simplest upgrade path.

## Development

Install dependencies once:

```powershell
npm install
```

Run the PHP API in one terminal:

```powershell
npm run server
```

Run Vite in a second terminal:

```powershell
npm run dev
```

Open <http://127.0.0.1:5173>. Vite serves the frontend and proxies `/api` requests to PHP on port `5174`.

The frontend uses URL routes. Useful pages include `/`, `/login`, `/register`, `/dashboard`, `/profile`, and `/boards/<board-id>`. Refreshing a route works through the PHP SPA fallback.

The npm scripts use `C:\xampp\php\php.exe`. If PHP is installed elsewhere, update the `server` and `start` scripts in `package.json`.

## Production-style local run

```powershell
npm run build
npm start
```

Then open <http://127.0.0.1:5174>. This serves the built frontend and API from PHP.

## Tests

```powershell
npm test
npm run build
npm run test:e2e
```

The end-to-end test needs MySQL running because it creates and uses a `pinboard_test` database. It also launches a browser through Playwright.

## Project layout

```text
src/                 Frontend application
  components/        Interactive React board components
  data/              Shared board seed/configuration data
  store/             Application state and autosave logic
  styles/            CSS split by feature
  views/             Landing, auth, dashboard, and modal views
server/              PHP API, database access, and MySQL schema
tests/
  unit/              Fast Node unit tests
  e2e/               Browser/API integration tests
dist/                Generated production output (ignored by Git)
```
