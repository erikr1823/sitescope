"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type Asset = {
  id: number;
  site_id: number;
  name: string;
  type: string;
  serial_number: string;
  status: string;
  client_name: string;
  site_name: string;
  notes?: string | null;
};

const TYPE_FILTER_OPTIONS = [
  "All",
  "Server",
  "Switch",
  "Router",
  "Access Point",
  "Workstation",
  "Laptop",
  "Printer",
  "Camera",
  "Phone",
  "Other",
] as const;

const filterToolbarControlStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text)",
  fontSize: "0.9rem",
};

function assetMatchesSearch(asset: Asset, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const needle = trimmed.toLowerCase();
  const fields = [
    asset.name,
    asset.type,
    asset.serial_number,
    asset.status,
    asset.client_name,
    asset.site_name,
    asset.notes ?? "",
  ];
  return fields.some((value) => String(value).toLowerCase().includes(needle));
}

function assetMatchesTypeFilter(asset: Asset, selected: (typeof TYPE_FILTER_OPTIONS)[number]): boolean {
  if (selected === "All") return true;
  return asset.type.trim().toLowerCase() === selected.toLowerCase();
}

export default function SiteAssetsPage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawSiteId = params?.id;
  const siteId = Array.isArray(rawSiteId) ? rawSiteId[0] : rawSiteId;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<(typeof TYPE_FILTER_OPTIONS)[number]>("All");

  const filteredAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          assetMatchesSearch(asset, searchQuery) &&
          assetMatchesTypeFilter(asset, typeFilter)
      ),
    [assets, searchQuery, typeFilter]
  );

  useEffect(() => {
    async function loadAssets() {
      if (!siteId) {
        setError("Site ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/assets?site_id=${encodeURIComponent(siteId)}`);

        if (!response.ok) {
          throw new Error("Failed to load site assets");
        }

        const data = (await response.json()) as Asset[];
        setAssets(data.filter((asset) => String(asset.site_id) === siteId));
      } catch {
        setError("Unable to load site assets right now.");
      } finally {
        setIsLoading(false);
      }
    }

    loadAssets();
  }, [siteId]);

  return (
    <main className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">Site Assets</h1>
          <p className="page__subtle">Asset inventory for this site.</p>
        </div>
        <Link href="/clients" className="btn btn--ghost">
          Back to Clients
        </Link>
      </div>

      {isLoading ? (
        <p className="status">Loading assets...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : assets.length === 0 ? (
        <section className="card">
          <p className="status">No assets found for this site.</p>
        </section>
      ) : (
        <section className="card table-wrap" aria-label="Site assets table">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <input
              type="search"
              aria-label="Search assets"
              placeholder="Search by name, type, serial, status, client, site, notes…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ ...filterToolbarControlStyle, flex: "1 1 220px", minWidth: "200px" }}
            />
            <label
              htmlFor="site-asset-type-filter"
              style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "0.88rem" }}
            >
              Type
              <select
                id="site-asset-type-filter"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as (typeof TYPE_FILTER_OPTIONS)[number])
                }
                style={{ ...filterToolbarControlStyle, minWidth: "160px", cursor: "pointer" }}
              >
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredAssets.length === 0 ? (
            <p className="status">No assets match your search or type filter.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Client</th>
                  <th>Site</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.name}</td>
                    <td>{asset.type}</td>
                    <td>{asset.serial_number}</td>
                    <td>{asset.status}</td>
                    <td>{asset.client_name}</td>
                    <td>{asset.site_name}</td>
                    <td>{asset.notes?.trim() || "-"}</td>
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
