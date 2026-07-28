CREATE TABLE IF NOT EXISTS cms_store (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
  ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS contact_rate_limits (
  id TEXT PRIMARY KEY,
  rate_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_rate_limits_key_created_at
  ON contact_rate_limits (rate_key, created_at);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  body_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO cms_store (key, value, updated_at)
VALUES
  ('projects', '[]', datetime('now')),
  ('pages', '[]', datetime('now')),
  ('messages', '[]', datetime('now'));
