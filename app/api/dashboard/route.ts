import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET() {
  try {
    const [countsRow] = await sql(
      `SELECT
         (SELECT COUNT(*)::int FROM clients) AS total_clients,
         (SELECT COUNT(*)::int FROM sites) AS total_sites,
         (SELECT COUNT(*)::int FROM assets) AS total_assets`,
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
       LIMIT 10`,
      []
    );

    return NextResponse.json({
      total_clients: Number(countsRow?.total_clients ?? 0),
      total_sites: Number(countsRow?.total_sites ?? 0),
      total_assets: Number(countsRow?.total_assets ?? 0),
      recent_assets,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
