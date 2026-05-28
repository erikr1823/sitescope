-- SiteScope — users table (Clerk handles sign-in; password_hash is optional)
-- Run this in the Neon SQL Editor.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'tech'
    CHECK (role IN ('admin', 'tech', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- Seed users (Clerk login — no plain-text passwords; password_hash left NULL)
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES
  ('Frank', 'frank@microdesk.com', NULL, 'admin', TRUE),
  ('Erik Rivera', 'erikr1823@gmail.com', NULL, 'admin', TRUE),
  ('Warehouse Client', 'ops@warehouse.com', NULL, 'viewer', TRUE)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
