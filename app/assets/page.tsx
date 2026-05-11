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
  notes?: string;
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

  function exportAssetsCsv() {
    const escapeCsvCell = (value: unknown): string => {
      const raw = value == null ? "" : String(value);
      return `"${raw.replace(/"/g, '""')}"`;
    };

    const headerRow = [
      "Name",
      "Type",
      "Serial Number",
      "Status",
      "Client",
      "Site",
      "Notes",
    ]
      .map((h) => escapeCsvCell(h))
      .join(",");

    const dataRows = assets.map((asset) =>
      [
        escapeCsvCell(asset.name),
        escapeCsvCell(asset.type),
        escapeCsvCell(asset.serial_number),
        escapeCsvCell(asset.status),
        escapeCsvCell(asset.client_name),
        escapeCsvCell(asset.site_name),
        escapeCsvCell(asset.notes),
      ].join(",")
    );

    const csv = [headerRow, ...dataRows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sitescope-inventory.csv";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Inventory</h1>
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportAssetsCsv}
              disabled={assets.length === 0}
            >
              Export CSV
            </button>
            <Link href="/clients" className="btn">
              Add Asset Manually
            </Link>
          </div>
        </div>
      </header>

      <section className="card">
        <p className="site-section-kicker">Add inventory</p>
        <h2 className="site-section-title">Manual inventory entry</h2>
        <p className="site-section-lead">
          Add assets from a site page or Network Scan.
        </p>
        <div className="form-actions">
          <Link href="/clients" className="btn-secondary">
            Open Site Pages
          </Link>
          <Link href="/scan" className="btn">
            Run Network Scan
          </Link>
        </div>
      </section>

      {isLoading ? (
        <section className="card" aria-label="Loading inventory">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line" />
          <div className="skeleton-table">
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
          </div>
        </section>
      ) : error ? (
        <section className="card">
          <p className="error">{error}</p>
        </section>
      ) : assets.length === 0 ? (
        <section className="card">
          <p className="site-section-kicker">Inventory</p>
          <h2 className="site-section-title">No inventory items found</h2>
          <p className="status">
            Start by adding an asset or running a network scan.
          </p>
          <div className="form-actions">
            <Link href="/clients" className="btn">
              Open Clients
            </Link>
            <Link href="/scan" className="btn-secondary">
              Run Network Scan
            </Link>
          </div>
        </section>
      ) : (
        <section className="card table-wrap" aria-labelledby="assets-table-title">
          <header className="form-card__head">
            <p className="site-section-kicker">Inventory</p>
            <h2 id="assets-table-title" className="site-section-title">
              All inventory
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
                  <td className="font-medium">
                    <Link href={`/assets/${asset.id}`} className="asset-link">
                      {asset.name}
                    </Link>
                  </td>
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