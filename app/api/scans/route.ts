import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteIdParam = searchParams.get("site_id");

  if (siteIdParam == null || siteIdParam.trim() === "") {
    return NextResponse.json(
      { error: "site_id is required" },
      { status: 400 }
    );
  }

  const siteId = Number(siteIdParam);
  if (!Number.isFinite(siteId) || siteId <= 0) {
    return NextResponse.json({ error: "Invalid site_id" }, { status: 400 });
  }

  try {
    const rows = await sql(
      `SELECT
         id,
         site_id,
         scanned_at,
         subnet,
         devices_found,
         scanned_by
       FROM scans
       WHERE site_id = $1
       ORDER BY scanned_at DESC NULLS LAST, id DESC`,
      [siteId]
    );

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json(
      { error: "Failed to load scans" },
      { status: 500 }
    );
  }
}
