import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(context.params);

  if (!id) {
    return NextResponse.json({ error: "Asset id is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, type, serial_number, status, notes } = body ?? {};

    if (name == null || type == null || serial_number == null || status == null) {
      return NextResponse.json(
        { error: "name, type, serial_number, and status are required" },
        { status: 400 }
      );
    }

    const updated = await sql(
      `UPDATE assets
       SET name = $1,
           type = $2,
           serial_number = $3,
           status = $4,
           notes = $5
       WHERE id = $6
       RETURNING id`,
      [name, type, serial_number, status, notes ?? null, id]
    );

    if (updated.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

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

    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to update asset" },
      { status: 500 }
    );
  }
}
