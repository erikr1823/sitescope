"use client";

import { useCallback, useEffect, useState } from "react";
import FeedbackPanel from "../../components/FeedbackPanel";
import { useAppUser } from "../../components/AppUserProvider";
import { roleLabel, type AppRole } from "../../../lib/roles";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string | null;
};

const emptyForm = {
  name: "",
  email: "",
  role: "tech" as AppRole,
  is_active: true,
};

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function AdminUsersPage() {
  const { isAdmin, isLoading: profileLoading, error: profileError } = useAppUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/users");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load users");
      }
      setUsers(payload as UserRow[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't load users. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadUsers();
    } else if (!profileLoading) {
      setIsLoading(false);
    }
  }, [isAdmin, profileLoading, loadUsers]);

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create user");
      }
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setIsSaving(false);
    }
  }

  async function patchUser(id: number, patch: { role?: AppRole; is_active?: boolean }) {
    setUpdatingId(id);
    setError("");
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update user");
      }
      setUsers((current) =>
        current.map((user) => (user.id === id ? { ...user, ...payload } : user))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (profileLoading) {
    return (
      <main className="page dashboard-page mobile-safe-page">
        <section className="card" aria-label="Loading admin users">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-table">
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
          </div>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="page dashboard-page mobile-safe-page">
        <section className="card">
          <h1 className="page__title">User management</h1>
          <p className="feedback-panel__message feedback-panel__message--error">
            {profileError ||
              "Admin access required. Contact an administrator if you need access."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page dashboard-page mobile-safe-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Users</h1>
            <p className="page__subtle">
              Manage SiteScope roles and access. Clerk handles sign-in; this table maps emails to
              roles.
            </p>
          </div>
        </div>
      </header>

      <section className="card admin-users-form" aria-labelledby="add-user-title">
        <header className="form-card__head">
          <p className="site-section-kicker">Administration</p>
          <h2 id="add-user-title" className="site-section-title">
            Add user
          </h2>
        </header>
        <form className="form-stack admin-users-form__grid" onSubmit={handleCreateUser}>
          <label className="form-field">
            <span className="form-label">Name</span>
            <input
              className="form-input mobile-touch-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="form-field">
            <span className="form-label">Email</span>
            <input
              className="form-input mobile-touch-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="form-field">
            <span className="form-label">Role</span>
            <select
              className="form-input mobile-touch-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })}
            >
              <option value="admin">Admin</option>
              <option value="tech">Tech</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label className="form-field form-field--checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <span className="form-label">Active</span>
          </label>
          {formError ? <p className="error">{formError}</p> : null}
          <div className="form-actions">
            <button type="submit" className="btn mobile-touch-btn" disabled={isSaving}>
              {isSaving ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <FeedbackPanel
          title="Could not update users"
          message={error}
          tone="error"
          actionLabel="Reload users"
          onAction={() => void loadUsers()}
        />
      ) : null}

      {isLoading ? (
        <section className="card" aria-label="Loading users">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-table">
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
          </div>
        </section>
      ) : (
        <>
          <section className="card table-wrap hidden md:block" aria-label="Users table">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        className="form-input"
                        value={user.role}
                        disabled={updatingId === user.id}
                        onChange={(e) =>
                          void patchUser(user.id, { role: e.target.value as AppRole })
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="tech">Tech</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td>{user.is_active ? "Active" : "Inactive"}</td>
                    <td>{formatWhen(user.last_login)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={updatingId === user.id}
                        onClick={() =>
                          void patchUser(user.id, { is_active: !user.is_active })
                        }
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="admin-users-cards md:hidden" aria-label="Users cards">
            {users.length === 0 ? (
              <section className="card">
                <p className="status">No users found. Add the first user above.</p>
              </section>
            ) : (
              users.map((user) => (
              <article key={user.id} className="card admin-user-card">
                <div className="admin-user-card__head">
                  <h3 className="admin-user-card__name">{user.name}</h3>
                  <span className={`role-badge role-badge--${user.role}`}>
                    {roleLabel(user.role)}
                  </span>
                </div>
                <p className="admin-user-card__email">{user.email}</p>
                <p className="admin-user-card__meta">
                  {user.is_active ? "Active" : "Inactive"} · Last login {formatWhen(user.last_login)}
                </p>
                <div className="admin-user-card__actions">
                  <select
                    className="form-input mobile-touch-input"
                    value={user.role}
                    disabled={updatingId === user.id}
                    onChange={(e) =>
                      void patchUser(user.id, { role: e.target.value as AppRole })
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="tech">Tech</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    className="btn-secondary mobile-touch-btn"
                    disabled={updatingId === user.id}
                    onClick={() => void patchUser(user.id, { is_active: !user.is_active })}
                  >
                    {user.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </article>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
