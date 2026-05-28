import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { sql } from "../../../../../lib/db";
import { requireWriteAccess, authFailureResponse } from "../../../../../lib/app-user";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const assetId = Number(id);

  if (!Number.isFinite(assetId) || assetId <= 0) {
    return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
  }

  try {
    const notes = await sql(
      `SELECT id, asset_id, note, note_type, created_by, created_at
       FROM asset_notes
       WHERE asset_id = $1
       ORDER BY created_at DESC, id DESC`,
      [assetId]
    );

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Failed to load asset notes:", error);

    return NextResponse.json(
      { error: "Failed to load asset notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireWriteAccess();
  const denied = authFailureResponse(authResult);
  if (denied) return denied;

  const { id } = await context.params;
  const assetId = Number(id);

  if (!Number.isFinite(assetId) || assetId <= 0) {
    return NextResponse.json({ error: "Invalid asset id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const note = String(body.note || "").trim();
    const noteType = String(body.note_type || "general").trim();

    const allowedTypes = ["general", "repair", "config", "warning"];

    if (!note) {
      return NextResponse.json({ error: "Note is required" }, { status: 400 });
    }

    if (!allowedTypes.includes(noteType)) {
      return NextResponse.json({ error: "Invalid note type" }, { status: 400 });
    }

    const assetRows = await sql(`SELECT id FROM assets WHERE id = $1`, [assetId]);

    if (assetRows.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const user = await currentUser();

    const createdBy =
      user?.fullName ||
      user?.primaryEmailAddress?.emailAddress ||
      "Unknown user";

    const createdNote = await sql(
      `INSERT INTO asset_notes (asset_id, note, note_type, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, asset_id, note, note_type, created_by, created_at`,
      [assetId, note, noteType, createdBy]
    );

    return NextResponse.json(createdNote[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create asset note:", error);

    return NextResponse.json(
      { error: "Failed to create asset note" },
      { status: 500 }
    );
  }
}
