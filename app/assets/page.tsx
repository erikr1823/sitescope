"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AssetMobileList from "../components/AssetMobileList";
import FeedbackPanel from "../components/FeedbackPanel";
import { useAppUser } from "../components/AppUserProvider";

type Asset = {
  id: number;
  name: string;
  type: string;
  serial_number: string;
  status: string;
  client_name: string;
  site_name: string;
  site_id?: number;
  client_id?: number;
  notes?: string;
};

type Site = { id: number; name: string; client_id: number; client_name?: string };

const defaultAssetForm = {
  site_id: "",
  name: "",
  type: "Device",
  serial_number: "",
  status: "Active",
  notes: "",
};

export default function AssetsPage() {
  const { canWrite } = useAppUser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [assetForm, setAssetForm] = useState(defaultAssetForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/assets");
        if (!response.ok) throw new Error("Failed to load assets");
        const payload = (await response.json()) as Asset[];
        if (!cancelled) setAssets(payload);
      } catch {
        if (!cancelled) {
          setAssets([]);
          setError("We couldn't load inventory. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!showMobileForm || !canWrite) return;

    let cancelled = false;

    async function loadSites() {
      try {
        const sitesRes = await fetch("/api/sites");
        if (sitesRes.ok && !cancelled) {
          setSites((await sitesRes.json()) as Site[]);
        }
      } catch {
        // Non-blocking for list view
      }
    }

    void loadSites();
    return () => {
      cancelled = true;
    };
  }, [showMobileForm, canWrite]);

  const sitesById = useMemo(() => {
    const map = new Map<number, Site>();
    for (const site of sites) map.set(site.id, site);
    return map;
  }, [sites]);

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

  async function handleMobileCreateAsset(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");
    setIsSaving(true);

    const siteId = Number(assetForm.site_id);
    const site = sitesById.get(siteId);
    if (!site) {
      setFormError("Select a valid site.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: site.client_id,
          site_id: siteId,
          name: assetForm.name.trim(),
          type: assetForm.type.trim() || "Device",
          serial_number: assetForm.serial_number.trim() || "N/A",
          status: assetForm.status.trim() || "Active",
          notes: assetForm.notes.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create asset");
      }

      if (photoFile && payload.id) {
        const formData = new FormData();
        formData.append("files", photoFile);
        await fetch(`/api/sites/${siteId}/photos`, {
          method: "POST",
          body: formData,
        }).catch(() => undefined);
      }

      setAssetForm(defaultAssetForm);
      setPhotoFile(null);
      setFormSuccess("Asset created.");
      setReloadKey((key) => key + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create asset.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page dashboard-page mobile-safe-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">Inventory</h1>
            <p className="page__subtle">Hardware inventory across all clients and sites.</p>
          </div>
          <div className="dashboard-hero__actions">
            <Link href="/" className="btn--ghost">
              Dashboard
            </Link>
            <button
              type="button"
              className="btn btn-secondary hidden md:inline-flex"
              onClick={exportAssetsCsv}
              disabled={assets.length === 0}
            >
              Export CSV
            </button>
            {canWrite ? (
              <button
                type="button"
                className="btn mobile-touch-btn md:hidden"
                onClick={() => setShowMobileForm((open) => !open)}
              >
                {showMobileForm ? "Close form" : "Add asset"}
              </button>
            ) : null}
            <Link href="/clients" className="btn hidden md:inline-flex">
              Add Asset Manually
            </Link>
          </div>
        </div>
      </header>

      {canWrite && showMobileForm ? (
        <section className="card mobile-add-asset md:hidden" aria-labelledby="mobile-add-asset-title">
          <h2 id="mobile-add-asset-title" className="site-section-title">
            Add asset
          </h2>
          <form className="form-stack" onSubmit={handleMobileCreateAsset}>
            <label className="form-field">
              <span className="form-label">Site</span>
              <select
                className="form-input mobile-touch-input"
                value={assetForm.site_id}
                onChange={(e) => setAssetForm({ ...assetForm, site_id: e.target.value })}
                required
              >
                <option value="">Select site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                    {site.client_name ? ` (${site.client_name})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Name</span>
              <input
                className="form-input mobile-touch-input"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Type</span>
              <input
                className="form-input mobile-touch-input"
                value={assetForm.type}
                onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Serial number</span>
              <input
                className="form-input mobile-touch-input"
                value={assetForm.serial_number}
                onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Status</span>
              <input
                className="form-input mobile-touch-input"
                value={assetForm.status}
                onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Notes (IP/MAC optional)</span>
              <textarea
                className="form-input mobile-touch-input"
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Photo (optional)</span>
              <input
                className="form-input mobile-touch-input mobile-file-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {formError ? <p className="error">{formError}</p> : null}
            {formSuccess ? <p className="status">{formSuccess}</p> : null}
            <button type="submit" className="btn mobile-touch-btn" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save asset"}
            </button>
          </form>
        </section>
      ) : null}

      {isLoading ? (
        <section className="card" aria-label="Loading inventory">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-table hidden md:block">
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
          </div>
          <div className="asset-mobile-list md:hidden">
            <div className="skeleton-table__row" />
            <div className="skeleton-table__row" />
          </div>
        </section>
      ) : error ? (
        <FeedbackPanel
          title="Inventory unavailable"
          message={error}
          tone="error"
          actionLabel="Try again"
          onAction={() => setReloadKey((key) => key + 1)}
        />
      ) : assets.length === 0 ? (
        <section className="card">
          <div className="empty-state">
            <h2 className="site-section-title">No inventory items yet</h2>
            <p className="status">Add an asset from a site, run a network scan, or use Add asset on mobile.</p>
            <div className="form-actions">
              <Link href="/clients" className="btn mobile-touch-btn">
                Open clients
              </Link>
              <Link href="/scan" className="btn-secondary mobile-touch-btn">
                Run scan
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="card table-wrap hidden md:block" aria-labelledby="assets-table-title">
            <header className="form-card__head">
              <h2 id="assets-table-title" className="site-section-title">
                All inventory
              </h2>
              <p className="site-section-lead">
                {assets.length} asset{assets.length === 1 ? "" : "s"} across all clients and sites.
              </p>
            </header>
            <table className="table w-full">
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
                    <td className="font-medium">
                      <Link href={`/assets/${asset.id}`} className="asset-link">
                        {asset.name}
                      </Link>
                    </td>
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

          <AssetMobileList assets={assets} />
        </>
      )}
    </main>
  );
}
