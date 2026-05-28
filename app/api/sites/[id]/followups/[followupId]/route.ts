import { NextResponse } from "next/server";
import { sql } from "../../../../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../../../../lib/app-user";

type RouteContext = {
  params: Promise<{
    id: string;
    followupId: string;
  }>;
};

function parseSiteId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function parseFollowupId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireWriteAccess();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  const { id, followupId: followupIdParam } = await context.params;
  const siteId = parseSiteId(id);
  const followupId = parseFollowupId(followupIdParam);

  if (siteId == null) {
    return NextResponse.json({ error: "Invalid site id" }, { status: 400 });
  }

  if (followupId == null) {
    return NextResponse.json({ error: "Invalid follow-up id" }, { status: 400 });
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
  if (!("is_complete" in o)) {
    return NextResponse.json(
      { error: "is_complete is required" },
      { status: 400 }
    );
  }

  const rawComplete = o.is_complete;
  if (typeof rawComplete !== "boolean") {
    return NextResponse.json(
      { error: "is_complete must be a boolean" },
      { status: 400 }
    );
  }

  try {
    const updated = await sql(
      `UPDATE site_followups
       SET is_complete = $1
       WHERE id = $2 AND site_id = $3
       RETURNING id, site_id, status, item_text, is_complete, created_at`,
      [rawComplete, followupId, siteId]
    );

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Follow-up not found for this site" },
        { status: 404 }
      );
    }

    return NextResponse.json({ followup: updated[0] });
  } catch (error) {
    console.error("Failed to update site follow-up:", error);
    return NextResponse.json(
      { error: "Failed to update follow-up item" },
      { status: 500 }
    );
  }
}
