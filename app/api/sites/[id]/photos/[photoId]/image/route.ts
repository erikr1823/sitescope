import { NextResponse } from "next/server";
import { getR2SignedGetUrl } from "../../../../../../../lib/r2";
import { sql } from "../../../../../../../lib/db";

type RouteContext = {
  params: Promise<{ id: string; photoId: string }>;
};

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id, photoId } = await context.params;
  const siteId = parseId(id);
  const pid = parseId(photoId);

  if (siteId == null || pid == null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const rows = await sql(
      `SELECT url FROM site_photos WHERE id = $1 AND site_id = $2`,
      [pid, siteId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const row = rows[0] as { url: string };
    const stored = row.url;

    if (stored.startsWith("http://") || stored.startsWith("https://")) {
      return NextResponse.redirect(stored, 302);
    }

    const signed = await getR2SignedGetUrl(stored, 3600);
    return NextResponse.redirect(signed, 302);
  } catch (error) {
    console.error("Failed to resolve photo image:", error);
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 500 }
    );
  }
}
