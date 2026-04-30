"use client";

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
    <main className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Assets</h1>
          <p className="page__subtle">
            Hardware inventory across all clients and sites.
          </p>
        </div>
        <button type="button" className="btn" disabled title="Coming soon">
          New Asset (Soon)
        </button>
      </div>

      {isLoading ? (
        <p className="status">Loading assets...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : assets.length === 0 ? (
        <section className="card">
          <p className="status">No assets found yet.</p>
        </section>
      ) : (
        <section className="card table-wrap" aria-label="Assets table">
          <table className="table">
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Serial Number</th>
                <th>Status</th>
                <th>Client</th>
                <th>Site</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{asset.type}</td>
                  <td>{asset.serial_number}</td>
                  <td>{asset.status}</td>
                  <td>{asset.client_name}</td>
                  <td>{asset.site_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
