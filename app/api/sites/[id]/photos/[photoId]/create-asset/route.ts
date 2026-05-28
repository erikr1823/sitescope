import { NextResponse } from "next/server";
import { sql } from "../../../../../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../../../../../lib/app-user";

type RouteContext = {
  params: Promise<{ id: string; photoId: string }>;
};

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireWriteAccess();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  const { id, photoId } = await context.params;
  const siteId = parseId(id);
  const pid = parseId(photoId);

  if (siteId == null || pid == null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "JSON object body is required" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  const type = typeof o.type === "string" ? o.type.trim() : "";
  const location =
    typeof o.location === "string" ? o.location.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  try {
    const photoRows = await sql(
      `SELECT id, asset_id FROM site_photos WHERE id = $1 AND site_id = $2`,
      [pid, siteId]
    );

    if (photoRows.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const photo = photoRows[0] as { id: number; asset_id: number | null };
    if (photo.asset_id != null) {
      return NextResponse.json(
        { error: "Photo is already linked to an asset" },
        { status: 409 }
      );
    }

    const siteRows = await sql(
      `SELECT id, client_id FROM sites WHERE id = $1`,
      [siteId]
    );

    if (siteRows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const site = siteRows[0] as { id: number; client_id: number };

    const notesParts: string[] = ["Created from site photo."];
    if (location) {
      notesParts.push(`Location: ${location}`);
    }
    const notes = notesParts.join(" ");

    const createdAsset = await sql(
      `INSERT INTO assets (client_id, site_id, name, type, serial_number, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [site.client_id, siteId, name, type, "", "Active", notes]
    );

    const asset = createdAsset[0] as { id: number };

    const updatedPhoto = await sql(
      `UPDATE site_photos
       SET asset_id = $1
       WHERE id = $2 AND site_id = $3 AND asset_id IS NULL
       RETURNING id, site_id, url, filename, asset_id, uploaded_at`,
      [asset.id, pid, siteId]
    );

    if (updatedPhoto.length === 0) {
      await sql(`DELETE FROM assets WHERE id = $1`, [asset.id]);
      return NextResponse.json(
        { error: "Could not link photo (it may have been linked already)" },
        { status: 409 }
      );
    }

    const photoRow = updatedPhoto[0] as Record<string, unknown>;

    return NextResponse.json({
      asset: createdAsset[0],
      photo: {
        ...photoRow,
        asset_name: name,
        previewUrl: `/api/sites/${siteId}/photos/${pid}/image`,
      },
    });
  } catch (error) {
    console.error("Failed to create asset from photo:", error);
    return NextResponse.json(
      { error: "Failed to create asset from photo" },
      { status: 500 }
    );
  }
}
