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
    <main className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Clients</h1>
          <p className="page__subtle">Track organizations and access their managed sites.</p>
        </div>
        <Link href="/clients/new" className="btn">
          Add Client
        </Link>
      </div>

      {isLoading ? (
        <p className="status">Loading clients...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <section className="card table-wrap" aria-label="Clients table">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={client.id ?? `${client.email ?? client.name}-${index}`}>
                  <td>{client.name}</td>
                  <td>{client.company}</td>
                  <td>{client.phone}</td>
                  <td>
                    {client.id ? (
                      <Link href={`/clients/${client.id}`} className="btn-secondary">
                        View Sites
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
