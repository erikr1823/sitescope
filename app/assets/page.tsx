"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Asset = {
  id: number;
  name: string;
  type: string;
  serial_number: string;
  status: string;
  client_name: string;
  site_name: string;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAssets() {
      try {
        const response = await fetch("/api/assets");

        if (!response.ok) {
          throw new Error("Failed to load assets");
        }

        const data = (await response.json()) as Asset[];
        setAssets(data);
      } catch {
        setError("Unable to load assets right now.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAssets();
  }, []);

  return (
    <main className="page dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Assets</h1>
            <p className="page__subtle">
              Hardware inventory across all clients and sites.
            </p>
            <p className="dashboard-hero__hint">
              Track lifecycle state, serial identifiers, and site placement from one searchable
              table.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <Link href="/" className="btn--ghost">
              Dashboard
            </Link>
            <button type="button" className="btn" disabled title="Coming soon">
              New asset (soon)
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <section className="card">
          <p className="status">Loading assets…</p>
        </section>
      ) : error ? (
        <section className="card">
          <p className="error">{error}</p>
        </section>
      ) : assets.length === 0 ? (
        <section className="card">
          <p className="site-section-kicker">Inventory</p>
          <h2 className="site-section-title">No assets found</h2>
          <p className="status">
            Add assets from a site page to populate this inventory view.
          </p>
        </section>
      ) : (
        <section className="card table-wrap" aria-labelledby="assets-table-title">
          <header className="form-card__head">
            <p className="site-section-kicker">Inventory</p>
            <h2 id="assets-table-title" className="site-section-title">
              All assets
            </h2>
            <p className="site-section-lead">
              {assets.length} asset{assets.length === 1 ? "" : "s"} across all clients and sites.
            </p>
          </header>
          <table className="table w-full max-md:!min-w-0">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th className="hidden md:table-cell">Serial Number</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Client</th>
                <th className="hidden md:table-cell">Site</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="font-medium">{asset.name}</td>
                  <td>{asset.type}</td>
                  <td className="hidden md:table-cell">{asset.serial_number}</td>
                  <td>{asset.status}</td>
                  <td className="hidden md:table-cell">{asset.client_name}</td>
                  <td className="hidden md:table-cell">{asset.site_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}