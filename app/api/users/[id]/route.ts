import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db";
import { requireAdmin, authFailureResponse } from "../../../../lib/app-user";
import { APP_ROLES, normalizeRole } from "../../../../lib/roles";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireAdmin();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { role, is_active } = body ?? {};

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (role !== undefined) {
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole || !APP_ROLES.includes(normalizedRole)) {
        return NextResponse.json(
          { error: "role must be admin, tech, or viewer" },
          { status: 400 }
        );
      }
      updates.push(`role = $${idx++}`);
      values.push(normalizedRole);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Provide role and/or is_active to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await sql(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING id, name, email, role, is_active, last_login, created_at, updated_at`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
