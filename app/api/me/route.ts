import { NextResponse } from "next/server";
import { getAppUser } from "../../../lib/app-user";

export async function GET() {
  try {
    const user = await getAppUser();
    if (!user) {
      return NextResponse.json(
        { error: "No active SiteScope user profile found for this Clerk account." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      canWrite: user.role === "admin" || user.role === "tech",
      isAdmin: user.role === "admin",
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
