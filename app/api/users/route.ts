import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { requireAdmin, authFailureResponse } from "../../../lib/app-user";
import { APP_ROLES, normalizeRole } from "../../../lib/roles";

export async function GET() {
  const authResult = await requireAdmin();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  try {
    const rows = await sql(
      `SELECT id, name, email, role, is_active, last_login, created_at, updated_at
       FROM users
       ORDER BY name ASC, id ASC`,
      []
    );

    return NextResponse.json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("relation") && message.includes("users")) {
      return NextResponse.json(
        {
          error:
            "Users table not found. Run sql/users.sql in Neon, then seed your admin user.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, email, role, is_active } = body ?? {};

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    const normalizedRole = normalizeRole(role) ?? "tech";
    if (!APP_ROLES.includes(normalizedRole)) {
      return NextResponse.json(
        { error: "role must be admin, tech, or viewer" },
        { status: 400 }
      );
    }

    const active = is_active === undefined ? true : Boolean(is_active);

    const rows = await sql(
      `INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, NULL, $3, $4, NOW(), NOW())
       RETURNING id, name, email, role, is_active, last_login, created_at, updated_at`,
      [name.trim(), email.trim().toLowerCase(), normalizedRole, active]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("duplicate") || message.includes("unique")) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
