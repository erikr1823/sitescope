"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NoteRow = {
  id: number;
  asset_id: number;
  note: string;
  note_type: string;
  created_by: string | null;
  created_at: string | null;
  asset_name: string;
  site_name: string;
  client_name: string;
};

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/notes");
        if (!response.ok) throw new Error("Failed to load notes");
        setNotes((await response.json()) as NoteRow[]);
      } catch {
        setError("Unable to load service notes.");
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main className="page dashboard-page mobile-safe-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Service Notes</h1>
            <p className="page__subtle">
              Recent maintenance and configuration notes across your inventory.
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <section className="card" aria-label="Loading notes">
          <div className="skeleton-line skeleton-line--title" />
          <div className="notes-timeline">
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
          </div>
        </section>
      ) : error ? (
        <p className="error">{error}</p>
      ) : notes.length === 0 ? (
        <section className="card">
          <p className="status">No service notes yet. Add notes from an asset detail page.</p>
          <Link href="/assets" className="btn">
            Browse assets
          </Link>
        </section>
      ) : (
        <section className="notes-timeline" aria-label="Service notes timeline">
          {notes.map((note) => (
            <article key={note.id} className="card note-timeline-card">
              <div className="note-timeline-card__head">
                <span className={`note-type-badge note-type-badge--${note.note_type}`}>
                  {note.note_type}
                </span>
                <time className="note-timeline-card__time">{formatWhen(note.created_at)}</time>
              </div>
              <p className="note-timeline-card__body">{note.note}</p>
              <div className="note-timeline-card__meta">
                <Link href={`/assets/${note.asset_id}`} className="asset-link">
                  {note.asset_name}
                </Link>
                <span>
                  {note.site_name} · {note.client_name}
                </span>
                {note.created_by ? <span>By {note.created_by}</span> : null}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
