import { NextResponse } from "next/server";
import { sql } from "../../../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../../../lib/app-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ALLOWED_STATUS = ["green", "yellow", "red"] as const;
type FollowupStatus = (typeof ALLOWED_STATUS)[number];

function parseSiteId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function normalizeStatus(value: unknown): FollowupStatus | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (s === "green" || s === "yellow" || s === "red") return s;
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const siteId = parseSiteId(id);

  if (siteId == null) {
    return NextResponse.json({ error: "Invalid site id" }, { status: 400 });
  }

  try {
    const rows = await sql(
      `SELECT id, site_id, status, item_text, is_complete, created_at
       FROM site_followups
       WHERE site_id = $1
       ORDER BY is_complete ASC, created_at DESC, id DESC`,
      [siteId]
    );

    return NextResponse.json({ followups: rows });
  } catch (error) {
    console.error("Failed to load site follow-ups:", error);
    return NextResponse.json(
      { error: "Failed to load follow-up items" },
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
  const itemText = typeof o.item_text === "string" ? o.item_text.trim() : "";
  const status = normalizeStatus(o.status);

  if (!itemText) {
    return NextResponse.json({ error: "item_text is required" }, { status: 400 });
  }

  if (status == null) {
    return NextResponse.json(
      { error: "status must be one of: green, yellow, red" },
      { status: 400 }
    );
  }

  try {
    const siteRows = await sql(`SELECT id FROM sites WHERE id = $1`, [siteId]);
    if (siteRows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const created = await sql(
      `INSERT INTO site_followups (site_id, status, item_text, is_complete)
       VALUES ($1, $2, $3, false)
       RETURNING id, site_id, status, item_text, is_complete, created_at`,
      [siteId, status, itemText]
    );

    return NextResponse.json({ followup: created[0] }, { status: 201 });
  } catch (error) {
    console.error("Failed to create site follow-up:", error);
    return NextResponse.json(
      { error: "Failed to create follow-up item" },
      { status: 500 }
    );
  }
}
