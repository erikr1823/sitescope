"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type QueueItem = {
  id: number;
  title: string;
  description: string | null;
  site_id: number | null;
  client_id: number | null;
  status: string;
  priority: string;
  created_at: string | null;
  updated_at: string | null;
  site_name?: string | null;
  client_name?: string | null;
};

const STATUSES = ["Open", "In Progress", "Waiting", "Done"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

function statusBadgeClass(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "open") return "queue-badge queue-badge--status-open";
  if (s === "in progress") return "queue-badge queue-badge--status-progress";
  if (s === "waiting") return "queue-badge queue-badge--status-waiting";
  if (s === "done") return "queue-badge queue-badge--status-done";
  return "queue-badge";
}

function priorityBadgeClass(priority: string): string {
  const p = priority.trim().toLowerCase();
  if (p === "low") return "queue-badge queue-badge--priority-low";
  if (p === "medium") return "queue-badge queue-badge--priority-medium";
  if (p === "high") return "queue-badge queue-badge--priority-high";
  if (p === "urgent") return "queue-badge queue-badge--priority-urgent";
  return "queue-badge";
}

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<(typeof PRIORITIES)[number]>("Medium");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/queue");
      const data = (await response.json()) as {
        items?: QueueItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load work queue");
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the work queue right now."
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function patchItem(
    item: QueueItem,
    patch: { status?: string; priority?: string }
  ) {
    setSavingId(item.id);

    const previous = item;
    setItems((list) =>
      list.map((row) => (row.id === item.id ? { ...row, ...patch } : row))
    );

    try {
      const response = await fetch(`/api/queue/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = (await response.json()) as { item?: QueueItem; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Update failed");
      }

      if (data.item) {
        setItems((list) =>
          list.map((row) => (row.id === item.id ? (data.item as QueueItem) : row))
        );
      }
    } catch (err) {
      setItems((list) =>
        list.map((row) => (row.id === item.id ? previous : row))
      );
      setError(err instanceof Error ? err.message : "Could not update item.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || addSaving) return;

    setAddSaving(true);
    setAddError("");

    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority: newPriority }),
      });

      const data = (await response.json()) as { item?: QueueItem; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not add item");
      }

      if (data.item) {
        setItems((list) => [data.item as QueueItem, ...list]);
      } else {
        await loadQueue();
      }

      setNewTitle("");
      setNewPriority("Medium");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add item.");
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <main className="page dashboard-page mobile-safe-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Work Queue</h1>
            <p className="page__subtle">
              Track tickets with status and priority — update items inline for fast triage.
            </p>
            <p className="dashboard-hero__hint">
              Track client follow-ups, repairs, and site tasks from one queue.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <Link href="/" className="btn--ghost">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="card" aria-labelledby="queue-add-title">
        <header className="form-card__head">
          <p className="site-section-kicker">New ticket</p>
          <h2 id="queue-add-title" className="site-section-title">
            Add to queue
          </h2>
        </header>
        <form
          className="form-stack"
          onSubmit={handleAdd}
          style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}
        >
          <label className="form-field" style={{ flex: "1 1 220px", margin: 0 }}>
            <span className="form-label">Title</span>
            <input
              className="form-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Describe the work…"
              disabled={addSaving}
              required
            />
          </label>
          <label className="form-field" style={{ flex: "0 1 140px", margin: 0 }}>
            <span className="form-label">Priority</span>
            <select
              className="form-input"
              value={newPriority}
              onChange={(e) =>
                setNewPriority(e.target.value as (typeof PRIORITIES)[number])
              }
              disabled={addSaving}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn" disabled={addSaving}>
            {addSaving ? "Adding…" : "Add"}
          </button>
        </form>
        {addError ? <p className="error">{addError}</p> : null}
      </section>

      <section className="card table-wrap" aria-labelledby="queue-list-title">
        <header className="form-card__head">
          <p className="site-section-kicker">Operations</p>
          <h2 id="queue-list-title" className="site-section-title">
            Active queue
          </h2>
        </header>

        {error ? <p className="error">{error}</p> : null}

        {isLoading ? (
          <div className="queue-skeleton" aria-label="Loading queue">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-table">
              <div className="skeleton-table__row" />
              <div className="skeleton-table__row" />
              <div className="skeleton-table__row" />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p className="status">No queue items yet.</p>
            <p className="site-section-lead">Add a ticket above to get started.</p>
          </div>
        ) : (
          <table className="table w-full max-md:!min-w-0">
            <thead>
              <tr>
                <th>Title</th>
                <th className="hidden md:table-cell">Context</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Quick status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">
                    <div>{item.title}</div>
                    {item.description ? (
                      <p className="queue-item-description">{item.description}</p>
                    ) : null}
                  </td>
                  <td className="hidden md:table-cell" style={{ fontSize: "0.88rem" }}>
                    {item.site_name ? (
                      <span>
                        Site: {item.site_name}
                        {item.site_id ? (
                          <>
                            {" "}
                            <Link href={`/sites/${item.site_id}`} className="asset-link">
                              Open
                            </Link>
                          </>
                        ) : null}
                      </span>
                    ) : item.client_name ? (
                      `Client: ${item.client_name}`
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className={priorityBadgeClass(item.priority)}>{item.priority}</span>
                    <select
                      className="form-input queue-inline-select"
                      value={item.priority}
                      disabled={savingId === item.id}
                      onChange={(e) =>
                        void patchItem(item, { priority: e.target.value })
                      }
                      aria-label={`Priority for ${item.title}`}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={statusBadgeClass(item.status)}>{item.status}</span>
                  </td>
                  <td>
                    <select
                      className="form-input queue-inline-select"
                      value={item.status}
                      disabled={savingId === item.id}
                      onChange={(e) => void patchItem(item, { status: e.target.value })}
                      aria-label={`Status for ${item.title}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
