export type AppRole = "admin" | "tech" | "viewer";

export const APP_ROLES: AppRole[] = ["admin", "tech", "viewer"];

export type AppUserRecord = {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function isAdmin(role: AppRole): boolean {
  return role === "admin";
}

export function canWrite(role: AppRole): boolean {
  return role === "admin" || role === "tech";
}

export function normalizeRole(value: unknown): AppRole | null {
  if (value === "admin" || value === "tech" || value === "viewer") return value;
  return null;
}

export function roleLabel(role: AppRole): string {
  if (role === "admin") return "Admin";
  if (role === "tech") return "Tech";
  return "Viewer";
}
