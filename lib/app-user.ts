import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sql } from "./db";
import type { AppRole, AppUserRecord } from "./roles";
import { canWrite, isAdmin, normalizeRole } from "./roles";

export type AuthSuccess = { ok: true; user: AppUserRecord };
export type AuthFailure = { ok: false; status: number; error: string };
export type AuthResult = AuthSuccess | AuthFailure;

export function authFailureResponse(result: AuthResult): NextResponse | null {
  if (result.ok === false) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return null;
}

type DbUserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapUser(row: DbUserRow): AppUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role) ?? "viewer",
    is_active: Boolean(row.is_active),
    last_login: row.last_login,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function lookupUserByEmail(email: string): Promise<AppUserRecord | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await sql(
    `SELECT id, name, email, role, is_active, last_login, created_at, updated_at
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalized]
  );

  if (rows.length === 0) return null;
  const user = mapUser(rows[0] as DbUserRow);
  if (!user.is_active) return null;
  return user;
}

function bootstrapAdminEmail(): string | null {
  const raw = process.env.SITESCOPE_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  return raw || null;
}

export async function getClerkEmail(): Promise<string | null> {
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ??
    user?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase() ??
    null;
  return email;
}

export async function getAppUser(): Promise<AppUserRecord | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const email = await getClerkEmail();
  if (!email) return null;

  try {
    const found = await lookupUserByEmail(email);
    if (found) {
      await sql(`UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1`, [
        found.id,
      ]).catch(() => undefined);
      return found;
    }

    const bootstrap = bootstrapAdminEmail();
    if (bootstrap && bootstrap === email) {
      return {
        id: 0,
        name: "Bootstrap Admin",
        email,
        role: "admin",
        is_active: true,
        last_login: null,
        created_at: null,
        updated_at: null,
      };
    }
  } catch {
    const bootstrap = bootstrapAdminEmail();
    if (bootstrap && bootstrap === email) {
      return {
        id: 0,
        name: "Bootstrap Admin",
        email,
        role: "admin",
        is_active: true,
        last_login: null,
        created_at: null,
        updated_at: null,
      };
    }
  }

  return null;
}

export async function requireAppUser(): Promise<AuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const user = await getAppUser();
  if (!user) {
    return {
      ok: false as const,
      status: 403,
      error: "No active SiteScope user profile found for this Clerk account.",
    };
  }

  return { ok: true as const, user };
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAppUser();
  if (!result.ok) return result;
  if (!isAdmin(result.user.role)) {
    return { ok: false as const, status: 403, error: "Admin access required." };
  }
  return result;
}

export async function requireWriteAccess(): Promise<AuthResult> {
  const result = await requireAppUser();
  if (!result.ok) return result;
  if (!canWrite(result.user.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "Read-only access. Changes are not allowed.",
    };
  }
  return result;
}
