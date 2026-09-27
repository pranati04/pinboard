-- Pinboard schema for MySQL (import via phpMyAdmin or `mysql < schema.sql`).
-- Select your database in phpMyAdmin, then import this file before running the PHP API.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  pass_hash VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX idx_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS boards (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'pinboard',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_public TINYINT NOT NULL DEFAULT 0,
  background VARCHAR(32) NOT NULL DEFAULT 'cork',
  updated_at BIGINT NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_boards_user (user_id),
  CONSTRAINT fk_boards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS nodes (
  id VARCHAR(64) NOT NULL,
  board_id VARCHAR(64) NOT NULL,
  type VARCHAR(16) NOT NULL DEFAULT 'text',
  title VARCHAR(255),
  content TEXT,
  x DOUBLE DEFAULT 0, y DOUBLE DEFAULT 0,
  w DOUBLE DEFAULT 250, h DOUBLE DEFAULT 0,
  tags TEXT,
  color VARCHAR(32) DEFAULT 'cream',
  PRIMARY KEY (id, board_id),
  INDEX idx_nodes_board (board_id),
  CONSTRAINT fk_nodes_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS connections (
  id VARCHAR(64) NOT NULL,
  board_id VARCHAR(64) NOT NULL,
  from_id VARCHAR(64) NOT NULL,
  to_id VARCHAR(64) NOT NULL,
  label VARCHAR(255),
  PRIMARY KEY (id, board_id),
  INDEX idx_connections_board (board_id),
  INDEX idx_connections_from (board_id, from_id),
  INDEX idx_connections_to (board_id, to_id),
  CONSTRAINT fk_connections_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  CONSTRAINT fk_connections_from FOREIGN KEY (from_id, board_id) REFERENCES nodes(id, board_id) ON DELETE CASCADE,
  CONSTRAINT fk_connections_to FOREIGN KEY (to_id, board_id) REFERENCES nodes(id, board_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- `groups` is a reserved word in MySQL 8 — named board_groups.
CREATE TABLE IF NOT EXISTS board_groups (
  id VARCHAR(64) NOT NULL,
  board_id VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  x DOUBLE DEFAULT 0, y DOUBLE DEFAULT 0, w DOUBLE DEFAULT 0, h DOUBLE DEFAULT 0,
  PRIMARY KEY (id, board_id),
  INDEX idx_groups_board (board_id),
  CONSTRAINT fk_groups_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(64) NOT NULL,
  board_id VARCHAR(64) NOT NULL,
  node_id VARCHAR(64) NULL,
  author VARCHAR(255),
  content TEXT,
  created_at BIGINT,
  PRIMARY KEY (id, board_id),
  INDEX idx_comments_board (board_id),
  INDEX idx_comments_node (board_id, node_id),
  CONSTRAINT fk_comments_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_node FOREIGN KEY (node_id, board_id) REFERENCES nodes(id, board_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shares (
  board_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (board_id, email),
  INDEX idx_shares_email (email),
  CONSTRAINT fk_shares_board FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
) ENGINE=InnoDB;
