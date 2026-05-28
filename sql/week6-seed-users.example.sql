-- SiteScope Week 6 — seed users (run AFTER week6-users.sql)
-- Step 1: generate bcrypt hashes locally (never commit real passwords):
--   node scripts/hash-password.mjs "ChangeMe-Frank-2026!"
--   node scripts/hash-password.mjs "ChangeMe-Erik-2026!"
--   node scripts/hash-password.mjs "ChangeMe-Warehouse-2026!"
-- Step 2: paste the three hashes below, then run this file in Neon.

INSERT INTO users (name, email, password_hash, role, is_active)
VALUES
  ('Frank', 'frank@microdesk.com', '$2a$10$REPLACE_WITH_FRANK_HASH', 'admin', TRUE),
  ('Erik Rivera', 'erikr1823@gmail.com', '$2a$10$REPLACE_WITH_ERIK_HASH', 'admin', TRUE),
  ('Warehouse Client', 'ops@warehouse.com', '$2a$10$REPLACE_WITH_WAREHOUSE_HASH', 'viewer', TRUE)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
