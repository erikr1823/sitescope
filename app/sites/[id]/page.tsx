"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Asset = {
  id: number;
  site_id: number;
  ip_address?: string | null;
  name: string;
  type: string;
  serial_number: string;
  status: string;
  client_name: string;
  site_name: string;
  notes?: string | null;
  created_at?: string | null;
};

type DiscoveredDevice = {
  ip_address: string;
  mac_address: string;
  hostname: string;
  manufacturer: string;
};

type SiteScan = {
  id: number;
  site_id: number;
  scanned_at: string | null;
  subnet: string;
  devices_found: number;
  scanned_by: string | null;
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

function formatScannedAt(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function csvValue(value: unknown): string {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, "\"\"");
  return `"${escaped}"`;
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
  const [showScanner, setShowScanner] = useState(false);
  const [subnet, setSubnet] = useState("192.168.10.0/24");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [savingIps, setSavingIps] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");
  const [scans, setScans] = useState<SiteScan[]>([]);
  const [scansLoading, setScansLoading] = useState(true);
  const [scansError, setScansError] = useState("");

  const filteredAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          assetMatchesSearch(asset, searchQuery) &&
          assetMatchesTypeFilter(asset, typeFilter)
      ),
    [assets, searchQuery, typeFilter]
  );

  const savedIpAddresses = useMemo(() => {
    const ipFromNotesRegex = /\bIP:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})\b/i;
    const normalized = new Set<string>();

    for (const asset of assets) {
      if (asset.ip_address?.trim()) {
        normalized.add(asset.ip_address.trim());
      }

      const notes = asset.notes?.trim();
      if (!notes) continue;
      const match = notes.match(ipFromNotesRegex);
      if (match?.[1]) {
        normalized.add(match[1]);
      }
    }

    return normalized;
  }, [assets]);

  const loadAssets = useCallback(async () => {
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
      setError("");
    } catch {
      setError("Unable to load site assets right now.");
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const loadScans = useCallback(async () => {
    if (!siteId) {
      setScansLoading(false);
      return;
    }

    setScansLoading(true);
    setScansError("");

    try {
      const response = await fetch(
        `/api/scans?site_id=${encodeURIComponent(siteId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load scan history");
      }

      const data = (await response.json()) as SiteScan[];
      setScans(Array.isArray(data) ? data : []);
    } catch {
      setScansError("Unable to load scan history right now.");
      setScans([]);
    } finally {
      setScansLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  async function runMockScan() {
    if (!siteId || isScanning) return;

    setScanError("");
    setIsScanning(true);
    setDiscoveredDevices([]);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subnet: subnet.trim(),
          site_id: Number(siteId),
        }),
      });

      if (!response.ok) {
        throw new Error("Scan failed");
      }

      const data = (await response.json()) as DiscoveredDevice[];
      setDiscoveredDevices(Array.isArray(data) ? data : []);
      await loadScans();
    } catch {
      setScanError("Unable to scan network right now.");
    } finally {
      setIsScanning(false);
    }
  }

  async function saveDiscoveredDevice(device: DiscoveredDevice) {
    if (!siteId) return;
    if (savedIpAddresses.has(device.ip_address)) return;

    setSaveError("");
    setSavingIps((current) => [...current, device.ip_address]);

    try {
      const payload = {
        client_id: 1,
        site_id: Number(siteId),
        name: device.hostname?.trim() || device.ip_address,
        type: "Other",
        serial_number: "",
        status: "Active",
        notes: `Discovered by network scan. IP: ${device.ip_address}, MAC: ${device.mac_address || ""}, Manufacturer: ${device.manufacturer || ""}`,
      };

      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save asset");
      }

      await loadAssets();
    } catch {
      setSaveError(`Unable to save ${device.ip_address} as an asset right now.`);
    } finally {
      setSavingIps((current) => current.filter((ip) => ip !== device.ip_address));
    }
  }

  function exportAssetsCsv() {
    if (!siteId || assets.length === 0) return;

    const headers = [
      "name",
      "type",
      "serial_number",
      "status",
      "client_name",
      "site_name",
      "notes",
      "created_at",
    ];

    const rows = assets.map((asset) =>
      [
        asset.name,
        asset.type,
        asset.serial_number,
        asset.status,
        asset.client_name,
        asset.site_name,
        asset.notes ?? "",
        asset.created_at ?? "",
      ]
        .map(csvValue)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sitescope-site-${siteId}-assets.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page site-page">
      <div className="page__header site-page__header">
        <div>
          <h1 className="page__title">Site Assets</h1>
          <p className="page__subtle">Asset inventory for this site.</p>
        </div>
        <Link href="/clients" className="btn btn--ghost shrink-0 max-md:w-full max-md:justify-center">
          Back to clients
        </Link>
      </div>

      <section
        className="card site-tool-card"
        aria-labelledby="site-network-scan-title"
      >
        <div className="site-tool-card__toolbar">
          <div>
            <p className="site-section-kicker">Network discovery</p>
            <h2 id="site-network-scan-title" className="site-section-title">
              Scan network
            </h2>
            <p className="site-section-lead">
              Enter a subnet in CIDR notation, run a scan, then review discovered hosts before
              saving them into inventory.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0 max-md:w-full md:self-center"
            onClick={() => setShowScanner((current) => !current)}
            aria-expanded={showScanner}
          >
            {showScanner ? "Hide scanner" : "Scan network"}
          </button>
        </div>

        {showScanner ? (
          <div className="site-tool-card__panel">
            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              <input
                type="text"
                aria-label="Subnet CIDR"
                value={subnet}
                onChange={(event) => setSubnet(event.target.value)}
                placeholder="192.168.10.0/24"
                className="w-full min-h-12 min-w-0 text-base md:min-h-0 md:flex-1 md:min-w-[210px] md:text-[0.9rem]"
                style={filterToolbarControlStyle}
              />
              <button
                type="button"
                className="btn w-full shrink-0 disabled:cursor-not-allowed disabled:opacity-75 md:w-auto"
                onClick={runMockScan}
                disabled={isScanning}
              >
                {isScanning ? "Scanning…" : "Run scan"}
              </button>
            </div>

            {scanError ? <p className="error mt-3">{scanError}</p> : null}
            {saveError ? <p className="error mt-3">{saveError}</p> : null}

            {discoveredDevices.length > 0 ? (
              <div className="table-wrap mt-4" aria-label="Discovered devices table">
                <table className="table w-full max-md:!min-w-0">
                  <thead>
                    <tr>
                      <th>IP Address</th>
                      <th className="hidden md:table-cell">MAC Address</th>
                      <th>Hostname</th>
                      <th className="hidden md:table-cell">Manufacturer</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoveredDevices.map((device) => (
                      <tr key={`${device.ip_address}-${device.hostname}`}>
                        <td>{device.ip_address}</td>
                        <td className="hidden md:table-cell">{device.mac_address || "—"}</td>
                        <td>{device.hostname || "—"}</td>
                        <td className="hidden md:table-cell">{device.manufacturer || "—"}</td>
                        <td>
                          {savedIpAddresses.has(device.ip_address) ? (
                            <span className="site-scan-saved">Already saved ✓</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-secondary w-full disabled:cursor-not-allowed disabled:opacity-75 md:w-auto"
                              onClick={() => saveDiscoveredDevice(device)}
                              disabled={savingIps.includes(device.ip_address)}
                            >
                              {savingIps.includes(device.ip_address)
                                ? "Saving…"
                                : "Save as asset"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isScanning ? (
              <p className="status mt-4">Scanning network…</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        className="card table-wrap site-inventory-card"
        aria-labelledby="site-inventory-title"
      >
        <header className="site-inventory-card__head">
          <p className="site-section-kicker">Inventory</p>
          <h2 id="site-inventory-title" className="site-section-title">
            Site assets
          </h2>
          <p className="site-section-lead">
            Search and filter the asset register for this site. Results update as you type; type
            filters apply together with search.
          </p>
        </header>

        {isLoading ? (
          <p className="status">Loading assets…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : assets.length === 0 ? (
          <p className="status">No assets found for this site.</p>
        ) : (
          <>
            <div className="site-inventory-card__filters flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              <input
                type="search"
                aria-label="Search assets"
                placeholder="Search by name, type, serial, status, client, site, notes…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full min-h-12 min-w-0 text-base md:min-h-0 md:flex-1 md:min-w-[200px] md:text-[0.9rem]"
                style={filterToolbarControlStyle}
              />
              <label
                htmlFor="site-asset-type-filter"
                className="flex w-full flex-col gap-2 text-[0.88rem] text-[var(--text-muted)] md:w-auto md:flex-row md:items-center md:gap-2"
              >
                Type
                <select
                  id="site-asset-type-filter"
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as (typeof TYPE_FILTER_OPTIONS)[number])
                  }
                  className="w-full min-h-12 cursor-pointer text-base md:min-h-0 md:min-w-[160px] md:w-auto md:text-[0.9rem]"
                  style={filterToolbarControlStyle}
                >
                  {TYPE_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-secondary w-full md:ml-auto md:w-auto"
                onClick={exportAssetsCsv}
              >
                Export CSV
              </button>
            </div>

            {filteredAssets.length === 0 ? (
              <p className="status">No assets match your search or type filter.</p>
            ) : (
              <table className="table w-full max-md:!min-w-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th className="hidden md:table-cell">Serial Number</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Client</th>
                    <th className="hidden md:table-cell">Site</th>
                    <th className="hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td>{asset.name}</td>
                      <td>{asset.type}</td>
                      <td className="hidden md:table-cell">{asset.serial_number}</td>
                      <td>{asset.status}</td>
                      <td className="hidden md:table-cell">{asset.client_name}</td>
                      <td className="hidden md:table-cell">{asset.site_name}</td>
                      <td className="hidden md:table-cell">{asset.notes?.trim() || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>

      <section
        className="card table-wrap site-history-card"
        aria-labelledby="site-scan-history-title"
      >
        <header className="site-history-card__head">
          <p className="site-section-kicker">Audit trail</p>
          <h2 id="site-scan-history-title" className="site-section-title">
            Scan history
          </h2>
          <p className="site-section-lead">
            Recorded subnet scans for this site, most recent first.
          </p>
        </header>

        {!siteId ? (
          <p className="status">Site ID is missing.</p>
        ) : scansLoading ? (
          <p className="status">Loading scan history…</p>
        ) : scansError ? (
          <p className="error">{scansError}</p>
        ) : scans.length === 0 ? (
          <p className="status">No scan history for this site yet.</p>
        ) : (
          <table className="table w-full max-md:!min-w-0">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Subnet</th>
                <th>Devices Found</th>
                <th>Scanned By</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td className="whitespace-nowrap text-sm md:text-base">
                    {formatScannedAt(scan.scanned_at)}
                  </td>
                  <td>{scan.subnet}</td>
                  <td>{scan.devices_found}</td>
                  <td>{scan.scanned_by?.trim() || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
