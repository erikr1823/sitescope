import { NextResponse } from "next/server";
import { sql } from "../../../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../../../lib/app-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const EDITABLE_FIELDS = [
  "isp",
  "corp_ssid",
  "guest_ssid",
  "ap_total",
  "ap_online",
  "device_count",
  "last_speed_down",
  "last_speed_up",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

function parseSiteId(raw: string | undefined): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function parsePatchBody(
  body: unknown
):
  | { ok: true; patch: Partial<Record<EditableField, unknown>> }
  | { ok: false; error: string; status: number } {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "JSON object body is required", status: 400 };
  }

  const o = body as Record<string, unknown>;
  const patch: Partial<Record<EditableField, unknown>> = {};

  for (const key of EDITABLE_FIELDS) {
    if (!(key in o)) continue;
    const value = o[key];
    if (value === undefined) continue;

    if (key === "ap_total" || key === "ap_online" || key === "device_count") {
      if (value === null) {
        patch[key] = null;
        continue;
      }
      if (typeof value === "number" && Number.isInteger(value)) {
        patch[key] = value;
        continue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
          return { ok: false, error: `${key} must be an integer`, status: 400 };
        }
        patch[key] = n;
        continue;
      }
      return { ok: false, error: `${key} must be an integer or null`, status: 400 };
    }

    if (key === "last_speed_down" || key === "last_speed_up") {
      if (value === null) {
        patch[key] = null;
        continue;
      }
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n)) {
        return { ok: false, error: `${key} must be a finite number or null`, status: 400 };
      }
      patch[key] = n;
      continue;
    }

    if (value === null) {
      patch[key] = null;
      continue;
    }
    if (typeof value !== "string") {
      return { ok: false, error: `${key} must be a string or null`, status: 400 };
    }
    patch[key] = value;
  }

  if (Object.keys(patch).length === 0) {
    return {
      ok: false,
      error: `Provide at least one of: ${EDITABLE_FIELDS.join(", ")}`,
      status: 400,
    };
  }

  return { ok: true, patch };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const siteId = parseSiteId(id);

  if (siteId == null) {
    return NextResponse.json({ error: "Invalid site id" }, { status: 400 });
  }

  try {
    const rows = await sql(
      `SELECT *
       FROM site_network_snapshot
       WHERE site_id = $1`,
      [siteId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ snapshot: null });
    }

    return NextResponse.json({ snapshot: rows[0] });
  } catch (error) {
    console.error("Failed to load site network snapshot:", error);
    return NextResponse.json(
      { error: "Failed to load network snapshot" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = parsePatchBody(body);
  if (parsed.ok === false) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const { patch } = parsed;

  try {
    const siteRows = await sql(`SELECT id FROM sites WHERE id = $1`, [siteId]);
    if (siteRows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const setFragments: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const key of EDITABLE_FIELDS) {
      if (!(key in patch)) continue;
      setFragments.push(`${key} = $${i}`);
      values.push(patch[key]);
      i += 1;
    }

    setFragments.push(`updated_at = NOW()`);

    const updateSql = `
      UPDATE site_network_snapshot
      SET ${setFragments.join(", ")}
      WHERE site_id = $${i}
      RETURNING *`;

    values.push(siteId);

    const updated = await sql(updateSql, values);

    if (updated.length > 0) {
      return NextResponse.json({ snapshot: updated[0] });
    }

    const keysInOrder = EDITABLE_FIELDS.filter((k) => k in patch);
    const columnList = ["site_id", ...keysInOrder, "updated_at"].join(", ");
    const valueList = [
      "$1",
      ...keysInOrder.map((_, idx) => `$${idx + 2}`),
      "NOW()",
    ].join(", ");

    const inserted = await sql(
      `INSERT INTO site_network_snapshot (${columnList})
       VALUES (${valueList})
       RETURNING *`,
      [siteId, ...keysInOrder.map((k) => patch[k])]
    );

    return NextResponse.json({ snapshot: inserted[0] });
  } catch (error) {
    console.error("Failed to save site network snapshot:", error);
    return NextResponse.json(
      { error: "Failed to save network snapshot" },
      { status: 500 }
    );
  }
}
