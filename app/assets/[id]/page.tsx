"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

type AssetDetail = {
  id: number;
  name: string;
  type: string;
  serial_number: string;
  status: string;
  client_name: string;
  site_name: string;
  notes?: string | null;
  created_at?: string | null;
};

type DraftFields = Pick<AssetDetail, "name" | "type" | "serial_number" | "status" | "notes">;
type NoteType = "general" | "repair" | "config" | "warning";

type AssetNote = {
  id: number;
  asset_id: number;
  note: string;
  note_type: NoteType;
  created_by: string;
  created_at: string | null;
};

type AssetLinkedPhoto = {
  id: number;
  site_id: number;
  url: string;
  filename: string;
  asset_id: number | null;
  uploaded_at: string | null;
  previewUrl: string;
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text)",
  fontSize: "0.92rem",
};

function formatTimestamp(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function draftFromAsset(asset: AssetDetail): DraftFields {
  return {
    name: asset.name,
    type: asset.type,
    serial_number: asset.serial_number,
    status: asset.status,
    notes: asset.notes ?? "",
  };
}

export default function AssetDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawId = params?.id;
  const assetId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [draft, setDraft] = useState<DraftFields>({
    name: "",
    type: "",
    serial_number: "",
    status: "",
    notes: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [serviceNotes, setServiceNotes] = useState<AssetNote[]>([]);
  const [isNotesLoading, setIsNotesLoading] = useState(true);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newNoteType, setNewNoteType] = useState<NoteType>("general");
  const [error, setError] = useState("");
  const [linkedPhotos, setLinkedPhotos] = useState<AssetLinkedPhoto[] | null>(null);

  const loadAsset = useCallback(async () => {
    if (!assetId) {
      setError("Asset ID is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/assets?id=${encodeURIComponent(assetId)}`);

      if (response.status === 404) {
        setAsset(null);
        setError("Asset not found.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load asset");
      }

      const data = (await response.json()) as AssetDetail;
      setAsset(data);
      setDraft(draftFromAsset(data));
    } catch {
      setError("Unable to load this asset right now.");
      setAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  const loadNotes = useCallback(async () => {
    if (!assetId) {
      setNotesError("Asset ID is missing.");
      setIsNotesLoading(false);
      return;
    }

    setIsNotesLoading(true);
    setNotesError("");

    try {
      const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}/notes`);

      if (!response.ok) {
        throw new Error("Failed to load notes");
      }

      const data = (await response.json()) as AssetNote[];
      setServiceNotes(data);
    } catch {
      setNotesError("Unable to load service history right now.");
      setServiceNotes([]);
    } finally {
      setIsNotesLoading(false);
    }
  }, [assetId]);

  const loadLinkedPhotos = useCallback(async () => {
    if (!assetId) {
      setLinkedPhotos(null);
      return;
    }

    setLinkedPhotos(null);

    try {
      const response = await fetch(
        `/api/assets/${encodeURIComponent(assetId)}/photos`
      );

      if (!response.ok) {
        setLinkedPhotos([]);
        return;
      }

      const data = (await response.json()) as { photos?: AssetLinkedPhoto[] };
      setLinkedPhotos(Array.isArray(data.photos) ? data.photos : []);
    } catch {
      setLinkedPhotos([]);
    }
  }, [assetId]);

  useEffect(() => {
    loadAsset();
    loadNotes();
    loadLinkedPhotos();
  }, [loadAsset, loadNotes, loadLinkedPhotos]);

  function handleEdit() {
    if (!asset) return;
    setDraft(draftFromAsset(asset));
    setIsEditing(true);
    setError("");
  }

  function handleCancel() {
    if (asset) setDraft(draftFromAsset(asset));
    setIsEditing(false);
    setError("");
  }

  async function handleSave() {
    if (!assetId || !asset) return;

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          type: draft.type,
          serial_number: draft.serial_number,
          status: draft.status,
          notes: draft.notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save asset");
      }

      const data = (await response.json()) as AssetDetail;
      setAsset(data);
      setDraft(draftFromAsset(data));
      setIsEditing(false);
    } catch {
      setError("Unable to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetId) return;

    const trimmedNote = newNote.trim();
    if (!trimmedNote) {
      setNotesError("Please enter a note before submitting.");
      return;
    }

    setIsSubmittingNote(true);
    setNotesError("");

    try {
      const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: trimmedNote,
          note_type: newNoteType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      const created = (await response.json()) as AssetNote;
      setServiceNotes((current) => [created, ...current]);
      setNewNote("");
      setNewNoteType("general");
    } catch {
      setNotesError("Unable to add service note. Please try again.");
    } finally {
      setIsSubmittingNote(false);
    }
  }

  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(130px, 190px) 1fr",
    gap: "8px 24px",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid var(--border)",
  };

  const labelStyle: CSSProperties = {
    margin: 0,
    color: "var(--text-muted)",
    fontSize: "0.82rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  const valueStyle: CSSProperties = { margin: 0, wordBreak: "break-word" };

  return (
    <main className="page dashboard-page">
      <div className="page__header">
        <div>
          <h1 className="page__title">{asset?.name ?? "Asset"}</h1>
          <p className="page__subtle">Hardware record and lifecycle details.</p>
          <p className="dashboard-hero__hint" style={{ marginTop: "8px" }}>
            Review core metadata, update fields in edit mode, and keep notes for operational
            context.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
          <Link href="/assets" className="btn--ghost">
            Back to assets
          </Link>

          {!isLoading && asset && !isEditing ? (
            <button type="button" className="btn" onClick={handleEdit}>
              Edit
            </button>
          ) : null}

          {!isLoading && asset && isEditing ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button type="button" className="btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <section className="card">
          <p className="status">Loading asset…</p>
        </section>
      ) : error && !asset ? (
        <section className="card">
          <p className="error">{error}</p>
        </section>
      ) : asset ? (
        <>
          {error ? <p className="error">{error}</p> : null}

          {linkedPhotos !== null && linkedPhotos.length > 0 ? (
            <section className="card" aria-labelledby="asset-photos-title">
              <header className="form-card__head" style={{ marginBottom: "4px" }}>
                <p className="site-section-kicker">Documentation</p>
                <h2 id="asset-photos-title" className="site-section-title">
                  Asset Photos
                </h2>
                <p className="site-section-lead">
                  Site images linked to this hardware record (served via your existing secure photo
                  URLs).
                </p>
              </header>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "14px",
                }}
              >
                {linkedPhotos.map((photo) => (
                  <figure key={photo.id} style={{ margin: 0 }}>
                    <div
                      style={{
                        aspectRatio: "4 / 3",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        background: "rgba(15, 23, 42, 0.55)",
                      }}
                    >
                      <img
                        src={photo.previewUrl}
                        alt=""
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                    <figcaption
                      style={{
                        marginTop: "8px",
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        lineHeight: 1.35,
                        wordBreak: "break-word",
                      }}
                      title={String(photo.filename ?? "")}
                    >
                      {photo.filename || "—"}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <section className="card" aria-labelledby="asset-record-title">
            <header className="form-card__head">
              <p className="site-section-kicker">Record view</p>
              <h2 id="asset-record-title" className="site-section-title">
                Asset details
              </h2>
              <p className="site-section-lead">
                {isEditing
                  ? "Edit mode is active. Update fields and save when ready."
                  : "Read-only view of this asset. Enter edit mode to update values."}
              </p>
            </header>
            <div style={{ display: "grid", gap: 0 }}>
              <div style={rowStyle}>
                <p style={labelStyle}>Name</p>
                <div>
                  {isEditing ? (
                    <input
                      style={inputStyle}
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      aria-label="Name"
                    />
                  ) : (
                    <p style={valueStyle}>{asset.name}</p>
                  )}
                </div>
              </div>

              <div style={rowStyle}>
                <p style={labelStyle}>Type</p>
                <div>
                  {isEditing ? (
                    <input
                      style={inputStyle}
                      value={draft.type}
                      onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                      aria-label="Type"
                    />
                  ) : (
                    <p style={valueStyle}>{asset.type}</p>
                  )}
                </div>
              </div>

              <div style={rowStyle}>
                <p style={labelStyle}>Serial Number</p>
                <div>
                  {isEditing ? (
                    <input
                      style={inputStyle}
                      value={draft.serial_number}
                      onChange={(e) => setDraft({ ...draft, serial_number: e.target.value })}
                      aria-label="Serial number"
                    />
                  ) : (
                    <p style={valueStyle}>{asset.serial_number}</p>
                  )}
                </div>
              </div>

              <div style={rowStyle}>
                <p style={labelStyle}>Status</p>
                <div>
                  {isEditing ? (
                    <input
                      style={inputStyle}
                      value={draft.status}
                      onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                      aria-label="Status"
                    />
                  ) : (
                    <p style={valueStyle}>{asset.status}</p>
                  )}
                </div>
              </div>

              <div style={rowStyle}>
                <p style={labelStyle}>Client</p>
                <p style={valueStyle}>{asset.client_name}</p>
              </div>

              <div style={rowStyle}>
                <p style={labelStyle}>Site</p>
                <p style={valueStyle}>{asset.site_name}</p>
              </div>

              <div style={{ ...rowStyle, alignItems: "start", borderBottom: "none", paddingBottom: 0 }}>
                <p style={{ ...labelStyle, paddingTop: "6px" }}>Notes</p>
                <div style={{ width: "100%" }}>
                  {isEditing ? (
                    <textarea
                      style={{ ...inputStyle, minHeight: "110px", resize: "vertical", fontFamily: "inherit" }}
                      value={draft.notes ?? ""}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      aria-label="Notes"
                    />
                  ) : (
                    <p style={valueStyle}>{asset.notes?.trim() ? asset.notes : "—"}</p>
                  )}
                </div>
              </div>

              <div style={{ ...rowStyle, borderBottom: "none", paddingTop: 4 }}>
                <p style={labelStyle}>Created</p>
                <p style={{ ...valueStyle, color: "var(--text-muted)" }}>
                  {formatTimestamp(asset.created_at)}
                </p>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="service-history-title">
            <header className="form-card__head">
              <p className="site-section-kicker">Maintenance log</p>
              <h2 id="service-history-title" className="site-section-title">
                Service History
              </h2>
              <p className="site-section-lead">
                Track maintenance, repairs, and configuration changes for this asset.
              </p>
            </header>

            <form onSubmit={handleSubmitNote} style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gap: "8px" }}>
                <label htmlFor="service-note" style={labelStyle}>
                  Note
                </label>
                <textarea
                  id="service-note"
                  style={{ ...inputStyle, minHeight: "110px", resize: "vertical", fontFamily: "inherit" }}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add maintenance details, changes made, or warnings..."
                  disabled={isSubmittingNote}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(140px, 220px) auto",
                  gap: "10px",
                  alignItems: "end",
                }}
              >
                <div style={{ display: "grid", gap: "8px" }}>
                  <label htmlFor="service-note-type" style={labelStyle}>
                    Type
                  </label>
                  <select
                    id="service-note-type"
                    style={inputStyle}
                    value={newNoteType}
                    onChange={(e) => setNewNoteType(e.target.value as NoteType)}
                    disabled={isSubmittingNote}
                  >
                    <option value="general">general</option>
                    <option value="repair">repair</option>
                    <option value="config">config</option>
                    <option value="warning">warning</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn"
                  disabled={isSubmittingNote}
                  style={{ width: "fit-content" }}
                >
                  {isSubmittingNote ? "Adding…" : "Add note"}
                </button>
              </div>
            </form>

            {notesError ? <p className="error">{notesError}</p> : null}

            {isNotesLoading ? (
              <p className="status">Loading service history…</p>
            ) : serviceNotes.length === 0 ? (
              <p className="status">No service notes yet.</p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {serviceNotes.map((noteItem) => (
                  <article
                    key={noteItem.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "12px",
                      background: "var(--bg-elevated)",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{noteItem.note}</p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px 14px",
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <span>Type: {noteItem.note_type}</span>
                      <span>By: {noteItem.created_by || "Unknown user"}</span>
                      <span>{formatTimestamp(noteItem.created_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
