import { NextResponse } from "next/server";
import { sql } from "../../../../../lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const assetId = Number(id);

  if (!Number.isFinite(assetId) || assetId <= 0) {
    return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
  }

  try {
    const rows = await sql(
      `SELECT sp.id, sp.site_id, sp.url, sp.filename, sp.asset_id, sp.uploaded_at
       FROM site_photos sp
       WHERE sp.asset_id = $1
       ORDER BY sp.uploaded_at DESC NULLS LAST, sp.id DESC`,
      [assetId]
    );

    const photos = rows.map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      site_id: Number(row.site_id),
      url: row.url,
      filename: row.filename,
      asset_id: row.asset_id != null ? Number(row.asset_id) : null,
      uploaded_at: row.uploaded_at,
      previewUrl: `/api/sites/${Number(row.site_id)}/photos/${Number(row.id)}/image`,
    }));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Failed to load linked site photos:", error);
    return NextResponse.json(
      { error: "Failed to load linked photos" },
      { status: 500 }
    );
  }
}
