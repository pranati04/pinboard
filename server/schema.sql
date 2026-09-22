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
  INDEX idx_user (user_id)
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
  PRIMARY KEY (id, user_id)
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
  PRIMARY KEY (id, board_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS connections (
  id VARCHAR(64) NOT NULL,
  board_id VARCHAR(64) NOT NULL,
  from_id VARCHAR(64) NOT NULL,
  to_id VARCHAR(64) NOT NULL,
  label VARCHAR(255),
  PRIMARY KEY (id, board_id)
) ENGINE=InnoDB;

-- `groups` is a reserved word in MySQL 8 — named board_groups.
CREATE TABLE IF NOT EXISTS board_groups (
  id VARCHAR(64) NOT NULL,
  board_id VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  x DOUBLE DEFAULT 0, y DOUBLE DEFAULT 0, w DOUBLE DEFAULT 0, h DOUBLE DEFAULT 0,
  PRIMARY KEY (id, board_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(64) NOT NULL,
  board_id VARCHAR(64) NOT NULL,
  node_id VARCHAR(64) NULL,
  author VARCHAR(255),
  content TEXT,
  created_at BIGINT,
  PRIMARY KEY (id, board_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shares (
  board_id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (board_id, email)
) ENGINE=InnoDB;
