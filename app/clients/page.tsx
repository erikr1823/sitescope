"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Client = {
  id?: number;
  name: string;
  company: string;
  phone: string;
  email?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadClients() {
      try {
        const response = await fetch("/api/clients");

        if (!response.ok) {
          throw new Error("Failed to load clients");
        }

        const data = (await response.json()) as Client[];
        setClients(data);
      } catch {
        setError("Unable to load clients right now.");
      } finally {
        setIsLoading(false);
      }
    }

    loadClients();
  }, []);

  return (
    <main className="page dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Clients</h1>
            <p className="page__subtle">
              Track organizations and open any record to manage sites and assets.
            </p>
            <p className="dashboard-hero__hint">
              Each client groups sites and hardware in one place. Add a client to start onboarding
              a new organization.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <Link href="/clients/new" className="btn">
              Add client
            </Link>
            <Link href="/" className="btn--ghost">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {isLoading ? (
        <section className="card" aria-live="polite">
          <p className="status">Loading clients…</p>
        </section>
      ) : error ? (
        <section className="card">
          <p className="error">{error}</p>
        </section>
      ) : (
        <section className="card table-wrap" aria-labelledby="clients-directory-title">
          <header className="form-card__head">
            <p className="site-section-kicker">Directory</p>
            <h2 id="clients-directory-title" className="site-section-title">
              All clients
            </h2>
            <p className="site-section-lead">
              {clients.length === 0
                ? "No clients yet — add your first client to begin tracking sites."
                : `${clients.length} client${clients.length === 1 ? "" : "s"} in your workspace. Open a row to view sites.`}
            </p>
          </header>

          {clients.length === 0 ? (
            <p className="status">No clients to display.</p>
          ) : (
            <table className="table w-full max-md:!min-w-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hidden md:table-cell">Company</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr key={client.id ?? `${client.email ?? client.name}-${index}`}>
                    <td className="font-medium">{client.name}</td>
                    <td className="hidden md:table-cell">{client.company}</td>
                    <td className="hidden md:table-cell whitespace-nowrap">
                      {client.phone}
                    </td>
                    <td className="clients-table-actions">
                      {client.id ? (
                        <Link
                          href={`/clients/${client.id}`}
                          className="btn-secondary inline-flex max-md:w-full max-md:justify-center"
                        >
                          View sites
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
