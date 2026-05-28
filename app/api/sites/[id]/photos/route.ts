import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { putR2Object } from "../../../../../lib/r2";
import { sql } from "../../../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../../../lib/app-user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_FILE_BYTES = 15 * 1024 * 1024;

function parseSiteId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?*:|"<>]/g, "_").slice(0, 200) || "image";
}

function isImageFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  return t.startsWith("image/");
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const siteId = parseSiteId(id);

  if (siteId == null) {
    return NextResponse.json({ error: "Invalid site id" }, { status: 400 });
  }

  try {
    const rows = await sql(
      `SELECT
         sp.id,
         sp.site_id,
         sp.url,
         sp.filename,
         sp.asset_id,
         sp.uploaded_at,
         a.name AS asset_name
       FROM site_photos sp
       LEFT JOIN assets a ON a.id = sp.asset_id
       WHERE sp.site_id = $1
       ORDER BY sp.uploaded_at DESC NULLS LAST, sp.id DESC`,
      [siteId]
    );

    const photos = rows.map((row: Record<string, unknown>) => ({
      ...row,
      previewUrl: `/api/sites/${siteId}/photos/${Number(row.id)}/image`,
    }));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Failed to list site photos:", error);
    return NextResponse.json(
      { error: "Failed to load site photos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireWriteAccess();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  const { id } = await context.params;
  const siteId = parseSiteId(id);

  if (siteId == null) {
    return NextResponse.json({ error: "Invalid site id" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const rawFiles = formData.getAll("files");
  const files = rawFiles.filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files provided (use form field name \"files\")" },
      { status: 400 }
    );
  }

  try {
    const siteRows = await sql(`SELECT id FROM sites WHERE id = $1`, [siteId]);
    if (siteRows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const created: unknown[] = [];

    for (const file of files) {
      if (!isImageFile(file)) {
        return NextResponse.json(
          { error: `Not an image file: ${file.name}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `File too large (max ${MAX_FILE_BYTES} bytes): ${file.name}` },
          { status: 400 }
        );
      }

      const safeName = sanitizeFilename(file.name);
      const key = `site-photos/${siteId}/${randomUUID()}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const contentType = file.type || "application/octet-stream";

      try {
        await putR2Object({ key, body: buffer, contentType });
      } catch (err) {
        console.error("R2 upload failed:", err);
        return NextResponse.json(
          { error: "Failed to upload image to storage" },
          { status: 502 }
        );
      }

      const inserted = await sql(
        `INSERT INTO site_photos (site_id, url, filename, asset_id)
         VALUES ($1, $2, $3, NULL)
         RETURNING id, site_id, url, filename, asset_id, uploaded_at`,
        [siteId, key, safeName]
      );

      const row = inserted[0] as Record<string, unknown>;
      created.push({
        ...row,
        asset_name: null,
        previewUrl: `/api/sites/${siteId}/photos/${Number(row.id)}/image`,
      });
    }

    return NextResponse.json({ photos: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to save site photos:", error);
    return NextResponse.json(
      { error: "Failed to save photo records" },
      { status: 500 }
    );
  }
}
