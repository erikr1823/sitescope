import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET() {
  try {
    const notes = await sql(
      `SELECT
         asset_notes.id,
         asset_notes.asset_id,
         asset_notes.note,
         asset_notes.note_type,
         asset_notes.created_by,
         asset_notes.created_at,
         assets.name AS asset_name,
         sites.name AS site_name,
         clients.name AS client_name
       FROM asset_notes
       JOIN assets ON assets.id = asset_notes.asset_id
       JOIN sites ON sites.id = assets.site_id
       JOIN clients ON clients.id = assets.client_id
       ORDER BY asset_notes.created_at DESC, asset_notes.id DESC
       LIMIT 40`,
      []
    );

    return NextResponse.json(notes);
  } catch {
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}
