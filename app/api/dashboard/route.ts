import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

type HealthStatus = "green" | "yellow" | "red" | "gray";

function computeSiteHealth(row: {
  last_speed_down: number | null;
  last_speed_up: number | null;
  ap_total: number | null;
  ap_online: number | null;
  open_followups: number;
}): HealthStatus {
  const down = row.last_speed_down != null ? Number(row.last_speed_down) : null;
  const up = row.last_speed_up != null ? Number(row.last_speed_up) : null;
  const apTotal = row.ap_total != null ? Number(row.ap_total) : null;
  const apOnline = row.ap_online != null ? Number(row.ap_online) : null;

  if (
    (down != null && Number.isFinite(down) && down < 25) ||
    (up != null && Number.isFinite(up) && up < 5)
  ) {
    return "red";
  }

  if (
    apTotal != null &&
    apOnline != null &&
    apTotal > 0 &&
    apOnline / apTotal < 0.5
  ) {
    return "red";
  }

  if (row.open_followups > 0) {
    return "yellow";
  }

  if (
    down != null ||
    up != null ||
    apTotal != null ||
    apOnline != null ||
    row.open_followups === 0
  ) {
    return "green";
  }

  return "gray";
}

function buildDailySeries(
  rows: { day: string; count: number }[]
): { date: string; count: number }[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = row.day.slice(0, 10);
    byDay.set(key, Number(row.count) || 0);
  }

  const series: { date: string; count: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 29; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const iso = d.toISOString().slice(0, 10);
    series.push({ date: iso, count: byDay.get(iso) ?? 0 });
  }

  return series;
}

export async function GET() {
  try {
    const [countsRow] = await sql(
      `SELECT
         (SELECT COUNT(*)::int FROM clients) AS total_clients,
         (SELECT COUNT(*)::int FROM sites) AS total_sites,
         (SELECT COUNT(*)::int FROM assets) AS total_assets,
         (SELECT COUNT(*)::int FROM assets
            WHERE created_at >= date_trunc('week', NOW())) AS assets_this_week,
         (SELECT COUNT(*)::int FROM assets
            WHERE created_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
              AND created_at < date_trunc('week', NOW())) AS assets_last_week`,
      []
    );

    const dailyRows = await sql(
      `SELECT
         (created_at AT TIME ZONE 'UTC')::date::text AS day,
         COUNT(*)::int AS count
       FROM assets
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY 1
       ORDER BY 1`,
      []
    );

    const recent_assets = await sql(
      `SELECT
         assets.id,
         assets.name,
         assets.type,
         assets.serial_number,
         sites.name AS site_name,
         clients.name AS client_name,
         assets.created_at
       FROM assets
       JOIN clients ON clients.id = assets.client_id
       JOIN sites ON sites.id = assets.site_id
       ORDER BY assets.created_at DESC NULLS LAST, assets.id DESC
       LIMIT 5`,
      []
    );

    const siteHealthRows = await sql(
      `SELECT
         sites.id,
         sites.name AS site_name,
         clients.name AS client_name,
         sns.ap_total,
         sns.ap_online,
         sns.device_count,
         sns.last_speed_down,
         sns.last_speed_up,
         sns.updated_at AS snapshot_updated_at,
         COALESCE(
           (SELECT COUNT(*)::int
            FROM site_followups sf
            WHERE sf.site_id = sites.id AND sf.is_complete = FALSE),
           0
         ) AS open_followups
       FROM sites
       JOIN clients ON clients.id = sites.client_id
       LEFT JOIN site_network_snapshot sns ON sns.site_id = sites.id
       ORDER BY sites.name ASC, sites.id ASC`,
      []
    );

    const site_health = siteHealthRows.map((row) => ({
      site_id: row.id,
      site_name: row.site_name,
      client_name: row.client_name,
      ap_total: row.ap_total != null ? Number(row.ap_total) : null,
      ap_online: row.ap_online != null ? Number(row.ap_online) : null,
      device_count: row.device_count != null ? Number(row.device_count) : null,
      last_speed_down: row.last_speed_down != null ? Number(row.last_speed_down) : null,
      last_speed_up: row.last_speed_up != null ? Number(row.last_speed_up) : null,
      open_followups: Number(row.open_followups ?? 0),
      snapshot_updated_at: row.snapshot_updated_at,
      health: computeSiteHealth({
        last_speed_down: row.last_speed_down != null ? Number(row.last_speed_down) : null,
        last_speed_up: row.last_speed_up != null ? Number(row.last_speed_up) : null,
        ap_total: row.ap_total != null ? Number(row.ap_total) : null,
        ap_online: row.ap_online != null ? Number(row.ap_online) : null,
        open_followups: Number(row.open_followups ?? 0),
      }),
    }));

    return NextResponse.json({
      total_clients: Number(countsRow?.total_clients ?? 0),
      total_sites: Number(countsRow?.total_sites ?? 0),
      total_assets: Number(countsRow?.total_assets ?? 0),
      assets_this_week: Number(countsRow?.assets_this_week ?? 0),
      assets_last_week: Number(countsRow?.assets_last_week ?? 0),
      assets_daily: buildDailySeries(
        dailyRows.map((row) => ({
          day: String(row.day),
          count: Number(row.count),
        }))
      ),
      recent_assets,
      site_health,
    });
  } catch (error) {
    console.error("Dashboard load failed:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
