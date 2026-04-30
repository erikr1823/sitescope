import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export async function GET() {
  const clients = await sql(
    "SELECT * FROM clients ORDER BY name ASC",
    []
  );

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, company, phone, email } = body ?? {};

    if (!name || !company || !phone || !email) {
      return NextResponse.json(
        { error: "name, company, phone, and email are required" },
        { status: 400 }
      );
    }

    const createdClient = await sql(
      `INSERT INTO clients (name, company, phone, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, company, phone, email]
    );

    return NextResponse.json(createdClient[0], { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}