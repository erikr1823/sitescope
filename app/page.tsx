"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardPayload = {
  total_clients: number;
  total_sites: number;
  total_assets: number;
  recent_assets: {
    id: number;
    name: string;
    type: string;
    serial_number: string;
    site_name: string;
    client_name: string;
    created_at: string | null;
  }[];
};

const summaryCards = [
  {
    key: "total_clients" as const,
    title: "Clients",
    description: "Manage customer profiles, contacts, and account ownership.",
  },
  {
    key: "total_sites" as const,
    title: "Sites",
    description: "Track active locations, operational details, and coverage.",
  },
  {
    key: "total_assets" as const,
    title: "Assets",
    description: "Review hardware inventory, lifecycle state, and deployment.",
  },
];

function formatCreatedAt(value: string | null): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function DashboardHomePage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to load dashboard");
        }
        const payload = (await response.json()) as DashboardPayload;
        setData(payload);
      } catch {
        setError("Unable to load dashboard right now.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="page">
      <section className="page__header">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtle">Welcome to SiteScope IT asset management.</p>
        </div>
        <Link href="/clients" className="btn">
          Open Clients
        </Link>
      </section>

      {isLoading ? (
        <p className="status">Loading dashboard...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : data ? (
        <>
          <section className="dashboard-grid" aria-label="Summary cards">
            {summaryCards.map((card) => (
              <article key={card.key} className="card dashboard-card">
                <p className="dashboard-card__label">{card.title}</p>
                <h2 className="dashboard-card__value">{data[card.key]}</h2>
                <p className="dashboard-card__description">{card.description}</p>
              </article>
            ))}
          </section>

          <section className="card table-wrap" aria-label="Recent assets">
            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: "1.05rem",
                fontWeight: 600,
              }}
            >
              Recent Assets
            </h2>
            <p className="page__subtle" style={{ margin: "0 0 16px 0" }}>
              Last 10 assets added across all sites.
            </p>

            {data.recent_assets.length === 0 ? (
              <p className="status">No assets yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Serial Number</th>
                    <th>Site</th>
                    <th>Client</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_assets.map((asset) => (
                    <tr key={asset.id}>
                      <td>{asset.name}</td>
                      <td>{asset.type}</td>
                      <td>{asset.serial_number}</td>
                      <td>{asset.site_name}</td>
                      <td>{asset.client_name}</td>
                      <td>{formatCreatedAt(asset.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
