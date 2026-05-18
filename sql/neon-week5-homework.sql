-- SiteScope Week 5 — run in Neon SQL Editor (in order)
-- Skip any block if that table already exists with the expected columns.

-- 1) Network snapshot (one row per site)
CREATE TABLE IF NOT EXISTS site_network_snapshot (
  site_id INTEGER PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,
  isp TEXT,
  corp_ssid TEXT,
  guest_ssid TEXT,
  ap_total INTEGER,
  ap_online INTEGER,
  device_count INTEGER,
  last_speed_down NUMERIC,
  last_speed_up NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Site follow-up checklist items
CREATE TABLE IF NOT EXISTS site_followups (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'yellow',
  item_text TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_followups_site_id ON site_followups(site_id);

-- 3) Site photos (R2 object key stored in url)
CREATE TABLE IF NOT EXISTS site_photos (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_photos_site_id ON site_photos(site_id);
CREATE INDEX IF NOT EXISTS idx_site_photos_asset_id ON site_photos(asset_id);

-- 4) Work queue / tickets
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

-- Optional demo rows (safe to run once)
INSERT INTO work_queue (title, description, status, priority)
SELECT 'Replace failed AP', 'Guest Wi-Fi coverage gap in lobby', 'Open', 'High'
WHERE NOT EXISTS (SELECT 1 FROM work_queue LIMIT 1);
