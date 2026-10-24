# Corkboard

Corkboard is a browser-based visual knowledge workspace for organising research, project ideas and mixed-media references on persistent boards. A board can contain notes, links, images, documents, audio, video, groups, labelled connections, comments and access rules.

The project treats a board as one coherent domain object. The frontend gives immediate visual feedback while users move, resize and edit content. The PHP API validates the board state, checks permissions and persists the related records in MySQL.

```text
Browser -> Vite + React frontend -> PHP JSON API -> MySQL
                                                   -> local uploads
```

## Main capabilities

- Create pinboard, moodboard and thought-map workspaces.
- Add text, image, link, document, audio and video content.
- Upload supported files or attach an external source URL.
- Drag, resize, zoom and automatically size nodes to their content.
- Organise nodes into groups and connect them with labelled relationships.
- Add comments, tags and board-level sharing permissions.
- Save board state automatically with retry handling.
- Detect stale writes with optimistic versioning instead of silently overwriting newer data.
- Protect data with PHP validation, prepared SQL statements, sessions and foreign-key constraints.

## Technology and project structure

The project uses React and Vite for the browser application, PHP for the JSON API, MySQL for relational persistence and XAMPP for local PHP/MySQL services.

```text
src/
  api.js                 API requests and uploads
  main.js                frontend entry point
  router.js              client-side route handling
  board.jsx              board application mount
  components/            board, nodes, groups, connections and editors
  data/                  board types and seed configuration
  store/                 application state and autosave logic
  styles/                feature-specific CSS
  views/                 landing, authentication, dashboard and profile views

server/
  config.php             database and CORS configuration
  db.php                 PDO connection and database operations
  http.php               JSON, request and session helpers
  index.php              PHP JSON API controller
  router.php             PHP front controller and SPA fallback
  schema.sql             MySQL table-creation script
  validation.php         board-document validation
  uploads/               runtime file uploads, ignored by Git

tests/
  unit/                  Node unit tests
  e2e/                   Playwright browser/API test

package.json             npm scripts and dependencies
vite.config.js           Vite configuration and API proxy
index.html               frontend HTML entry point
```

## Prerequisites

- Node.js 18 or newer and npm.
- XAMPP with PHP 8.2 or newer and MySQL/MariaDB.
- PHP `fileinfo` extension for uploaded-file MIME detection.
- A modern browser such as Chrome or Edge.
- Playwright browsers only if you want to run end-to-end tests.

The included npm scripts expect PHP at `C:\xampp\php\php.exe`. If PHP is installed somewhere else, update the `server` and `start` scripts in [`package.json`](package.json), or run PHP manually as shown below.

## Installation and first-time setup

### 1. Open the repository directory

Run npm from the project root. Running it from `C:\Users\pranati` or another directory causes the `package.json` not found error.

```powershell
cd C:\Users\pranati\Downloads\corkboard
```

### 2. Install frontend dependencies

```powershell
npm install
```

### 3. Start MySQL in XAMPP

Open the XAMPP Control Panel and start **MySQL**. Apache is not required for the provided development commands because PHP's built-in server is used.

### 4. Create and initialise the database

The complete table definition is in [`server/schema.sql`](server/schema.sql). Create and initialise the database using the dedicated [`SQL_SCRIPTS.md`](SQL_SCRIPTS.md) document or phpMyAdmin.

Using phpMyAdmin:

1. Open `http://localhost/phpmyadmin`.
2. Create a database named `pinboard` using `utf8mb4`.
3. Select `pinboard`.
4. Open **Import**.
5. Choose `server/schema.sql` and execute the import.

### 5. Configure the API if necessary

The defaults suit a standard XAMPP installation:

```text
Host:     127.0.0.1
Port:     3306
Database: pinboard
User:     root
Password: empty
```

Defaults are defined in [`server/config.php`](server/config.php). Override them with environment variables when required:

```powershell
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_NAME = 'pinboard'
$env:DB_USER = 'root'
$env:DB_PASS = ''
$env:APP_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
```

The application stores uploaded files under `server/uploads/<user-id>/`. Make sure PHP can write to `server/uploads`.

## Execution instructions

### Development mode

Use two PowerShell terminals and keep both processes running.

**Terminal 1: start the PHP API**

```powershell
cd C:\Users\pranati\Downloads\corkboard
npm run server
```

The API starts at `http://127.0.0.1:5174`.

**Terminal 2: start the Vite frontend**

```powershell
cd C:\Users\pranati\Downloads\corkboard
npm run dev
```

Open `http://localhost:5173`.

Vite proxies `/api` requests to PHP on port `5174`. MySQL must remain running while using registration, login, boards, saving, sharing or uploads.

### Production-style local mode

Build the frontend and serve the built application and API through the PHP router:

```powershell
cd C:\Users\pranati\Downloads\corkboard
npm run build
npm start
```

Open `http://127.0.0.1:5174`. The PHP router serves API requests, uploaded files, static build files and the SPA fallback needed when refreshing a client-side route.

### Available npm commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development frontend |
| `npm run server` | Start the PHP API on port 5174 |
| `npm run build` | Create the production frontend in `dist/` |
| `npm start` | Build the frontend and serve it through PHP |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Build and run Playwright end-to-end tests |
| `npm run preview` | Preview the Vite production build |

## Application routes

```text
/                    landing page
/login               login page
/register            registration page
/dashboard           board dashboard
/profile             user profile
/boards/<board-id>   individual board workspace
```

The client-side router uses the History API. It also flushes pending board saves before navigation where required.

## PHP API overview

The main controller is [`server/index.php`](server/index.php):

```text
POST              /api/auth/register
POST              /api/auth/login
POST              /api/auth/logout
GET               /api/me
PATCH             /api/me
GET               /api/boards
POST              /api/boards
GET               /api/boards/<id>
PATCH             /api/boards/<id>
DELETE            /api/boards/<id>
PUT               /api/boards/<id>/state
GET/POST/DELETE   /api/boards/<id>/shares
POST              /api/uploads
```

Normal requests use JSON. File uploads use `multipart/form-data`, are checked by MIME type and size, stored with generated filenames and served through the PHP router.

The board save flow is:

```text
Open board -> load board document -> edit local state -> debounce autosave
           -> validate and authorise request -> MySQL transaction
           -> update confirmed version
```

If the submitted version is older than the database version, the API rejects the write as stale. The frontend retains the unsaved state so the user does not lose work silently.

## Database design

The relational schema is defined in [`server/schema.sql`](server/schema.sql). The main relations are:

```text
users          account identity and ownership
sessions       authenticated session tokens
boards         board metadata, visibility and version
nodes          text/media content and geometry
board_groups   spatial grouping information
connections    labelled relationships between nodes
comments       board or node discussion
shares         board-level access roles
```

The schema keeps parent facts in `boards` and stores repeating child facts in separate relations. Foreign keys maintain board ownership and connection endpoints. Composite keys keep node, group, connection and comment records scoped to their board. [`server/db.php`](server/db.php) uses PDO prepared statements for database access.

## Testing

Run the unit tests:

```powershell
npm test
```

Run the browser/API integration test:

```powershell
npm run test:e2e
```

The end-to-end test builds the frontend and requires a working MySQL instance. It uses the configured test database, normally `pinboard_test`, and exercises registration, authentication, board creation, persistence, permissions, profile updates, save failures and deletion.

## Troubleshooting

### `npm error ENOENT: package.json`

Run npm from the repository root:

```powershell
cd C:\Users\pranati\Downloads\corkboard
npm run dev
```

### The frontend loads but API requests fail

Check that MySQL is running, the PHP API terminal is running, `pinboard` exists, `server/schema.sql` was imported and the credentials in `server/config.php` are correct.

### Uploads fail or return an HTML error

Confirm that PHP's `fileinfo` extension is enabled and that PHP can write to `server/uploads`. An HTML response beginning with `<br />` usually indicates a PHP warning or fatal error. Check the PHP terminal and error log for the underlying message.

### A board route fails after refresh

Use the PHP router:

```powershell
npm run build
npm start
```

### Vite reports `spawn EPERM`

Close duplicate Vite processes and retry from a normal PowerShell window. This is a Windows process-permission issue rather than an application route or database error.

## Future improvements

- Move uploaded files to object storage with signed URLs.
- Add file deletion, metadata management and virus scanning.
- Replace whole-board writes with incremental updates for very large boards.
- Add board history, restore points and conflict-resolution UI.
- Introduce formal database migrations for schema changes.
- Add real-time collaboration and presence indicators.
- Improve keyboard accessibility and mobile editing.
