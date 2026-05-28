-- SiteScope Week 6 — users table + role-based access
-- Run in Neon SQL Editor after Week 5 migrations.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tech'
    CHECK (role IN ('admin', 'tech', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- Dashboard trend queries expect assets.created_at
ALTER TABLE assets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Seed users: replace PASSWORD_HASH_* placeholders after running:
--   node scripts/hash-password.mjs "YourSecurePassword"
--
-- Example (DO NOT use these hashes in production — generate your own):
-- INSERT INTO users (name, email, password_hash, role) VALUES
--   ('Frank', 'frank@microdesk.com', '$2a$10$REPLACE_ME', 'admin'),
--   ('Erik Rivera', 'erikr1823@gmail.com', '$2a$10$REPLACE_ME', 'admin'),
--   ('Warehouse Client', 'ops@warehouse.com', '$2a$10$REPLACE_ME', 'viewer')
-- ON CONFLICT (email) DO UPDATE SET
--   name = EXCLUDED.name,
--   role = EXCLUDED.role,
--   password_hash = EXCLUDED.password_hash,
--   is_active = TRUE,
--   updated_at = NOW();
