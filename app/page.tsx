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
    href: "/clients",
    description: "Organizations you support — open records to manage contacts and ownership.",
    cta: "View clients",
  },
  {
    key: "total_sites" as const,
    title: "Sites",
    href: "/clients",
    description: "Physical or logical locations tied to clients; drill in from any client record.",
    cta: "Browse via clients",
  },
  {
    key: "total_assets" as const,
    title: "Assets",
    href: "/assets",
    description: "Hardware and devices across your estate — serials, status, and placement.",
    cta: "Open asset inventory",
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
    <main className="page dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Dashboard</h1>
            <p className="page__subtle">
              Live counts and the latest additions across your IT footprint.
            </p>
            <p className="dashboard-hero__hint">
              Use this view for a quick health check before diving into clients, sites, or the
              full asset register. Numbers refresh each time you open the dashboard.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <Link href="/clients" className="btn">
              Open Clients
            </Link>
            <Link href="/assets" className="btn--ghost">
              View Inventory
            </Link>
            <Link href="/scan" className="btn-secondary">
              Run Network Scan
            </Link>
          </div>
        </div>
      </header>

      {isLoading ? (
        <p className="status">Loading dashboard…</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : data ? (
        <>
          <section className="dashboard-stat-grid" aria-label="Summary statistics">
            {summaryCards.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                className="dashboard-stat-card"
              >
                <span className="dashboard-stat-card__eyebrow">{card.title}</span>
                <span className="dashboard-stat-card__value">{data[card.key]}</span>
                <p className="dashboard-stat-card__hint">{card.description}</p>
                <span className="dashboard-stat-card__cta">{card.cta} →</span>
              </Link>
            ))}
          </section>

          <section className="card table-wrap dashboard-section" aria-labelledby="recent-assets-heading">
            <div className="dashboard-section__header">
              <p className="dashboard-section__kicker">Activity</p>
              <h2 id="recent-assets-heading" className="dashboard-section__title">
                Recent assets
              </h2>
              <p className="dashboard-section__lead">
                The ten most recently created assets, across all clients and sites. Use this list
                to spot new deployments without running a full inventory report.
              </p>
            </div>

            {data.recent_assets.length === 0 ? (
              <p className="status">
                No assets yet. Add hardware from a site page or your asset workflow to see them
                here.
              </p>
            ) : (
              <table className="table w-full max-md:!min-w-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th className="hidden md:table-cell">Serial Number</th>
                    <th className="hidden md:table-cell">Site</th>
                    <th className="hidden md:table-cell">Client</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_assets.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <Link href={`/assets/${asset.id}`} className="asset-link">
                          {asset.name}
                        </Link>
                      </td>
                      <td>{asset.type}</td>
                      <td className="hidden md:table-cell">{asset.serial_number}</td>
                      <td className="hidden md:table-cell">{asset.site_name}</td>
                      <td className="hidden md:table-cell">{asset.client_name}</td>
                      <td className="whitespace-nowrap text-sm md:text-base">
                        {formatCreatedAt(asset.created_at)}
                      </td>
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
