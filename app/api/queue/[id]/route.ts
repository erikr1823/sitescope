import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../../lib/app-user";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireWriteAccess();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  const { id } = await context.params;
  const itemId = parseId(id);

  if (itemId == null) {
    return NextResponse.json({ error: "Invalid queue item id" }, { status: 400 });
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
  const patch: Record<string, unknown> = {};

  if ("status" in o) {
    if (typeof o.status !== "string" || !STATUSES.includes(o.status as (typeof STATUSES)[number])) {
      return NextResponse.json(
        { error: "status must be one of: Open, In Progress, Waiting, Done" },
        { status: 400 }
      );
    }
    patch.status = o.status;
  }

  if ("priority" in o) {
    if (
      typeof o.priority !== "string" ||
      !PRIORITIES.includes(o.priority as (typeof PRIORITIES)[number])
    ) {
      return NextResponse.json(
        { error: "priority must be one of: Low, Medium, High, Urgent" },
        { status: 400 }
      );
    }
    patch.priority = o.priority;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Provide status and/or priority to update" },
      { status: 400 }
    );
  }

  try {
    const setParts = Object.keys(patch).map((key, i) => `${key} = $${i + 1}`);
    setParts.push("updated_at = NOW()");
    const values = [...Object.values(patch), itemId];

    const updated = await sql(
      `UPDATE work_queue
       SET ${setParts.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, title, description, site_id, client_id, status, priority, created_at, updated_at`,
      values
    );

    if (updated.length === 0) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    const enriched = await sql(`${QUEUE_SELECT} WHERE wq.id = $1`, [itemId]);

    return NextResponse.json({ item: enriched[0] ?? updated[0] });
  } catch (error) {
    console.error("Failed to update queue item:", error);

    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error:
            'The work_queue table is missing. Run sql/work_queue.sql in the Neon SQL Editor.',
          code: "MISSING_TABLE",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update queue item" },
      { status: 500 }
    );
  }
}
