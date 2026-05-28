import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../lib/app-user";

const STATUSES = ["Open", "In Progress", "Waiting", "Done"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

const QUEUE_SELECT = `SELECT
         wq.id,
         wq.title,
         wq.description,
         wq.site_id,
         wq.client_id,
         wq.status,
         wq.priority,
         wq.created_at,
         wq.updated_at,
         sites.name AS site_name,
         clients.name AS client_name
       FROM work_queue wq
       LEFT JOIN sites ON sites.id = wq.site_id
       LEFT JOIN clients ON clients.id = wq.client_id`;

function isMissingTableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return (
    err?.code === "42P01" ||
    (typeof err?.message === "string" &&
      err.message.includes('relation "work_queue" does not exist'))
  );
}

function queueDbErrorResponse(error: unknown, action: string) {
  console.error(`Failed to ${action} work queue:`, error);

  if (isMissingTableError(error)) {
    return NextResponse.json(
      {
        error:
          'The work_queue table is missing. Run sql/work_queue.sql in the Neon SQL Editor, then refresh.',
        code: "MISSING_TABLE",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: `Failed to ${action} work queue` },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const rows = await sql(
      `${QUEUE_SELECT}
       ORDER BY
         CASE wq.priority
           WHEN 'Urgent' THEN 1
           WHEN 'High' THEN 2
           WHEN 'Medium' THEN 3
           WHEN 'Low' THEN 4
           ELSE 5
         END,
         wq.updated_at DESC NULLS LAST,
         wq.id DESC`,
      []
    );

    return NextResponse.json({ items: rows });
  } catch (error) {
    return queueDbErrorResponse(error, "load");
  }
}

export async function POST(request: Request) {
  const authResult = await requireWriteAccess();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

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
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const description =
    typeof o.description === "string" ? o.description.trim() : null;
  const status =
    typeof o.status === "string" && STATUSES.includes(o.status as (typeof STATUSES)[number])
      ? o.status
      : "Open";
  const priority =
    typeof o.priority === "string" &&
    PRIORITIES.includes(o.priority as (typeof PRIORITIES)[number])
      ? o.priority
      : "Medium";

  const siteId =
    o.site_id != null && Number.isFinite(Number(o.site_id))
      ? Number(o.site_id)
      : null;
  const clientId =
    o.client_id != null && Number.isFinite(Number(o.client_id))
      ? Number(o.client_id)
      : null;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const created = await sql(
      `INSERT INTO work_queue (title, description, site_id, client_id, status, priority, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [title, description || null, siteId, clientId, status, priority]
    );

    const newId = Number((created[0] as { id: number }).id);
    const enriched = await sql(`${QUEUE_SELECT} WHERE wq.id = $1`, [newId]);

    return NextResponse.json({ item: enriched[0] ?? created[0] }, { status: 201 });
  } catch (error) {
    return queueDbErrorResponse(error, "create");
  }
}
