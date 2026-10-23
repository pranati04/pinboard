# Corkboard

Corkboard is a visual collaboration workspace for organizing research, project ideas and mixed-media references. Users can create boards containing notes, images, links, documents, audio, video, groups, connections, comments and tags.

## Stack

- Vite, JavaScript, React and CSS frontend
- PHP JSON API
- MySQL database with PDO
- XAMPP for local PHP and MySQL
- Node test runner and Playwright for testing

```text
Browser -> Vite/React -> PHP JSON API -> MySQL
                                      -> local uploads
```

## Features

- Pinboard, moodboard and thought-map board types
- Text, image, link, file, audio and video nodes
- Dragging, zooming, resizing and automatic content sizing
- Groups, labelled connections, comments, tags and search
- Public/private boards and viewer/editor sharing
- File uploads up to 25 MB or external source URLs
- Automatic saving, retry handling and optimistic versioning
- Prepared SQL statements, validation and foreign-key constraints

## Requirements

- Node.js 18 or newer
- XAMPP with PHP 8.2+ and MySQL
- PHP `fileinfo` extension for upload MIME detection
- Playwright browser runtime for end-to-end tests

The npm scripts expect PHP at `C:\xampp\php\php.exe`. If PHP is elsewhere, update the `server` and `start` scripts in [`package.json`](package.json).

## First-time setup

Install dependencies from the repository root:

```powershell
npm install
```

Start MySQL in XAMPP. Create a database named `pinboard` in phpMyAdmin and import [`server/schema.sql`](server/schema.sql).

Default database settings:

```text
Host:     127.0.0.1
Port:     3306
Database: pinboard
User:     root
Password: empty
```

Override these values with `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` and `APP_ORIGINS`. Defaults are defined in [`server/config.php`](server/config.php).

For a disposable development database, import the schema into a new database. Back up an existing database before changing its schema.

## Development

Use two PowerShell terminals from `C:\Users\pranati\Downloads\corkboard`.

Terminal 1:

```powershell
npm run server
```

This starts the PHP API at `http://127.0.0.1:5174`.

Terminal 2:

```powershell
npm run dev
```

Open `http://localhost:5173`.

Vite proxies `/api` requests to PHP on port `5174`. Keep MySQL running while using authentication, boards, saving and uploads.

## Production-style local run

```powershell
npm run build
npm start
```

Open `http://127.0.0.1:5174`. The PHP router serves the built frontend, API requests, uploaded files and the SPA fallback needed for refreshing client-side routes.

## Application routes

```text
/                  Landing page
/login             Login page
/register          Registration page
/dashboard         Board dashboard
/profile           User profile
/boards/<board-id> Individual board workspace
```

The client-side router uses the History API and flushes pending board saves before navigation.

## API overview

The main controller is [`server/index.php`](server/index.php):

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/me
PATCH  /api/me
GET    /api/boards
POST   /api/boards
GET    /api/boards/<id>
PATCH  /api/boards/<id>
DELETE /api/boards/<id>
PUT    /api/boards/<id>/state
GET/POST/DELETE /api/boards/<id>/shares
POST   /api/uploads
```

JSON requests use the Fetch API. Uploads use `multipart/form-data`, are checked by MIME type and size, and are stored under `server/uploads/<user-id>/` with generated filenames.

## Architecture and persistence

The board is the main React surface. Landing, authentication, dashboard and profile views use lightweight JavaScript views. The board is mounted by [`src/board.jsx`](src/board.jsx) and rendered through [`src/components/BoardView.jsx`](src/components/BoardView.jsx).

The board flow is:

```text
Open board -> GET board document -> edit local state -> debounced autosave
           -> PUT board state -> PHP validation/authorization -> MySQL transaction
```

The saved document contains `nodes`, `connections`, `groups`, `comments` and `version`. [`src/store/boardSaver.js`](src/store/boardSaver.js) serializes saves, keeps failed changes dirty and supports retrying. The backend rejects stale versions instead of silently overwriting newer edits.

## Database

The schema is defined in [`server/schema.sql`](server/schema.sql). Relations are:

```text
users, sessions, boards, nodes,
connections, board_groups, comments, shares
```

Database access is implemented in [`server/db.php`](server/db.php) using PDO prepared statements. Validation is centralised in [`server/validation.php`](server/validation.php). Foreign keys and cascading deletes preserve board relationships and remove child records when a board is deleted.

## Tests

Run unit tests:

```powershell
npm test
```

These cover autosave, failed saves, retry handling, serialized writes and route parsing.

Run the production build:

```powershell
npm run build
```

Run the browser/API integration test:

```powershell
npm run test:e2e
```

The end-to-end test requires MySQL and uses a separate `pinboard_test` database. It verifies registration, login, board creation, persistence, permissions, profile updates, save failures and deletion.

## Project structure

```text
src/
  api.js                Fetch API and uploads
  main.js               Application entry point
  router.js             Client-side routes
  board.jsx             React board mounting
  components/           Board, nodes, groups, connections and editors
  data/                 Board types and seed configuration
  store/                Global state and autosave
  styles/               Feature-specific CSS
  views/                Landing, auth, dashboard and modal views

server/
  config.php            Database and CORS configuration
  db.php                PDO access and persistence
  http.php               JSON, CORS and session helpers
  index.php              PHP JSON API
  router.php             API, upload and SPA front controller
  schema.sql             MySQL schema
  validation.php         Board document validation
  uploads/               Runtime uploads, ignored by Git

tests/unit/              Fast Node unit tests
tests/e2e/               Playwright browser/API test
dist/                    Generated production output
```

## Troubleshooting

### `Could not read package.json`

Run npm from the repository root:

```powershell
cd C:\Users\pranati\Downloads\corkboard
npm run dev
```

### Vite reports `spawn EPERM`

Close duplicate Vite processes and retry from a normal PowerShell window. This means Windows prevented Vite's esbuild process from starting.

### Database errors

Confirm that MySQL is running, `pinboard` exists, `server/schema.sql` was imported and the credentials in `server/config.php` are correct.

### Upload errors

Confirm that PHP's `fileinfo` extension is enabled and PHP can create `server/uploads/`. The maximum upload size is 25 MB.

### A board route fails after refresh

Use the PHP router:

```powershell
npm run build
npm start
```

## Future improvements

- Cloud object storage instead of local uploads
- Signed download URLs, file deletion and virus scanning
- Incremental node saves for very large boards
- Real-time collaboration with WebSockets
- Board history and restore points
- Formal database migration scripts
- Improved keyboard accessibility and mobile editing
