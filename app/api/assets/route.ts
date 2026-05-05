import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    try {
      const rows = await sql(
        `SELECT
           assets.*,
           clients.name AS client_name,
           sites.name AS site_name
         FROM assets
         JOIN clients ON clients.id = assets.client_id
         JOIN sites ON sites.id = assets.site_id
         WHERE assets.id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to load asset" },
        { status: 500 }
      );
    }
  }

  try {
    const assets = await sql(
      `SELECT
         assets.*,
         clients.name AS client_name,
         sites.name AS site_name
       FROM assets
       JOIN clients ON clients.id = assets.client_id
       JOIN sites ON sites.id = assets.site_id
       ORDER BY assets.id DESC`,
      []
    );

    return NextResponse.json(assets);
  } catch {
    return NextResponse.json(
      { error: "Failed to load assets" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, site_id, name, type, serial_number, status, notes } =
      body ?? {};

    if (!client_id || !site_id || !name || !type || !serial_number || !status) {
      return NextResponse.json(
        {
          error:
            "client_id, site_id, name, type, serial_number, and status are required",
        },
        { status: 400 }
      );
    }

    const createdAsset = await sql(
      `INSERT INTO assets (client_id, site_id, name, type, serial_number, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [client_id, site_id, name, type, serial_number, status, notes ?? null]
    );

    return NextResponse.json(createdAsset[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}
