CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  github_login    TEXT NOT NULL UNIQUE,
  avatar_url      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  banned          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_usage (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         TEXT NOT NULL REFERENCES users(id),
  date            TEXT NOT NULL,
  claude_tokens   INTEGER NOT NULL DEFAULT 0,
  codex_tokens    INTEGER NOT NULL DEFAULT 0,
  total_tokens    INTEGER NOT NULL DEFAULT 0,
  claude_cost_usd REAL NOT NULL DEFAULT 0,
  models_used     TEXT,
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_usage(date);
CREATE INDEX IF NOT EXISTS idx_daily_total ON daily_usage(total_tokens DESC);
