"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
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
  const [error, setError] = useState("");

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

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

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

  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 200px) 1fr",
    gap: "8px 24px",
    alignItems: "center",
    padding: "10px 0",
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
    <main className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">{asset?.name ?? "Asset"}</h1>
          <p className="page__subtle">Hardware record and lifecycle details.</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "flex-end" }}>
          <Link href="/sites/2" className="btn-secondary">
            Back
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
        <p className="status">Loading asset...</p>
      ) : error && !asset ? (
        <p className="error">{error}</p>
      ) : asset ? (
        <>
          {error ? <p className="error">{error}</p> : null}

          <section className="card" aria-label="Asset details">
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
                      style={{
                        ...inputStyle,
                        minHeight: "100px",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
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
        </>
      ) : null}
    </main>
  );
}
