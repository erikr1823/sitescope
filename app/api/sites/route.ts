import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../lib/app-user";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    const sites = await sql(
      `SELECT sites.*, clients.name AS client_name
       FROM sites
       JOIN clients ON clients.id = sites.client_id
       ORDER BY sites.name ASC, sites.id ASC`,
      []
    );
    return NextResponse.json(sites);
  }

  const sites = await sql(
    "SELECT * FROM sites WHERE client_id = $1 ORDER BY id DESC",
    [clientId]
  );

  return NextResponse.json(sites);
}

export async function POST(request: Request) {
  const authResult = await requireWriteAccess();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { client_id, name, address, city, notes } = body ?? {};

    if (!client_id || !name) {
      return NextResponse.json(
        { error: "client_id and name are required" },
        { status: 400 }
      );
    }

    const createdSite = await sql(
      `INSERT INTO sites (client_id, name, address, city, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [client_id, name, address, city, notes ?? null]
    );

    return NextResponse.json(createdSite[0], { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create site" },
      { status: 500 }
    );
  }
}