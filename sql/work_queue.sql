-- Run this in Neon SQL Editor if Work Queue fails to load.

CREATE TABLE IF NOT EXISTS work_queue (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  priority TEXT NOT NULL DEFAULT 'Medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_queue_status ON work_queue(status);
CREATE INDEX IF NOT EXISTS idx_work_queue_priority ON work_queue(priority);

-- If the table already exists but is missing columns (older partial migration):
ALTER TABLE work_queue ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE work_queue ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE work_queue ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE work_queue ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Open';
ALTER TABLE work_queue ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'Medium';
ALTER TABLE work_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE work_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO work_queue (title, description, status, priority)
SELECT 'Replace failed AP', 'Guest Wi-Fi coverage gap in lobby', 'Open', 'High'
WHERE NOT EXISTS (SELECT 1 FROM work_queue LIMIT 1);
