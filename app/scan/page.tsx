"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Client = {
  id: number;
  name: string;
};

type Site = {
  id: number;
  client_id: number;
  name: string;
  address?: string | null;
};

type Asset = {
  id: number;
  site_id: number;
  ip_address?: string | null;
  name: string;
  notes?: string | null;
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

function formatScannedAt(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function normalizeHost(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function extractSubnetOrDefault(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  const cidrPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/;
  const match = raw.match(cidrPattern);
  return match?.[0] ?? "192.168.10.0/24";
}

export default function NetworkScanPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [subnet, setSubnet] = useState("192.168.10.0/24");

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [savingIps, setSavingIps] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");

  const [scans, setScans] = useState<SiteScan[]>([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [scansError, setScansError] = useState("");

  useEffect(() => {
    async function loadClientsAndSites() {
      setSitesLoading(true);
      setSitesError("");

      try {
        const clientsResponse = await fetch("/api/clients");
        if (!clientsResponse.ok) {
          throw new Error("Failed to load clients");
        }

        const allClients = (await clientsResponse.json()) as Client[];
        setClients(Array.isArray(allClients) ? allClients : []);

        const siteResponses = await Promise.all(
          (Array.isArray(allClients) ? allClients : []).map(async (client) => {
            const response = await fetch(
              `/api/sites?client_id=${encodeURIComponent(String(client.id))}`
            );
            if (!response.ok) {
              return [] as Site[];
            }
            return (await response.json()) as Site[];
          })
        );

        const mergedSites = siteResponses.flat();
        setSites(mergedSites);

        const firstClient = Array.isArray(allClients) && allClients[0] ? allClients[0] : null;
        if (firstClient) {
          setSelectedClientId(String(firstClient.id));
          const firstSiteForClient = mergedSites.find((site) => site.client_id === firstClient.id);
          if (firstSiteForClient) {
            setSelectedSiteId(String(firstSiteForClient.id));
            setSubnet(extractSubnetOrDefault(firstSiteForClient.address));
          } else {
            setSelectedSiteId("2");
            setSubnet("192.168.10.0/24");
          }
        } else if (mergedSites.length > 0) {
          setSelectedSiteId(String(mergedSites[0].id));
          setSubnet(extractSubnetOrDefault(mergedSites[0].address));
        } else {
          setSelectedSiteId("2");
        }
      } catch {
        setSitesError("Unable to load sites right now.");
      } finally {
        setSitesLoading(false);
      }
    }

    loadClientsAndSites();
  }, []);

  const sitesForSelectedClient = useMemo(() => {
    if (!selectedClientId) return sites;
    return sites.filter((site) => String(site.client_id) === selectedClientId);
  }, [selectedClientId, sites]);

  const selectedSite = useMemo(
    () => sites.find((site) => String(site.id) === selectedSiteId) ?? null,
    [selectedSiteId, sites]
  );

  const selectedClientName = useMemo(() => {
    if (!selectedSite) return "";
    const client = clients.find((item) => item.id === selectedSite.client_id);
    return client?.name ?? "";
  }, [clients, selectedSite]);

  useEffect(() => {
    if (!sites.length) return;
    const sitesForClient = sitesForSelectedClient;
    const matchingSite = sitesForClient.find((site) => String(site.id) === selectedSiteId);
    if (matchingSite) return;
    if (sitesForClient[0]) {
      setSelectedSiteId(String(sitesForClient[0].id));
      setSubnet(extractSubnetOrDefault(sitesForClient[0].address));
      return;
    }
    setSelectedSiteId("2");
    setSubnet("192.168.10.0/24");
  }, [selectedClientId, selectedSiteId, sites, sitesForSelectedClient]);

  const loadAssets = useCallback(async () => {
    if (!selectedSiteId) {
      setAssets([]);
      return;
    }

    setAssetsLoading(true);
    try {
      const response = await fetch(`/api/assets?site_id=${encodeURIComponent(selectedSiteId)}`);
      if (!response.ok) {
        throw new Error("Failed to load assets");
      }
      const data = (await response.json()) as Asset[];
      setAssets(Array.isArray(data) ? data.filter((asset) => String(asset.site_id) === selectedSiteId) : []);
    } catch {
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }, [selectedSiteId]);

  const loadScans = useCallback(async () => {
    if (!selectedSiteId) {
      setScans([]);
      return;
    }

    setScansLoading(true);
    setScansError("");
    try {
      const response = await fetch(`/api/scans?site_id=${encodeURIComponent(selectedSiteId)}`);
      if (!response.ok) {
        throw new Error("Failed to load scans");
      }
      const data = (await response.json()) as SiteScan[];
      setScans(Array.isArray(data) ? data : []);
    } catch {
      setScans([]);
      setScansError("Unable to load scan history right now.");
    } finally {
      setScansLoading(false);
    }
  }, [selectedSiteId]);

  useEffect(() => {
    setDiscoveredDevices([]);
    setScanError("");
    setSaveError("");
    void loadAssets();
    void loadScans();
  }, [loadAssets, loadScans]);

  const existingIps = useMemo(() => {
    const ipFromNotesRegex = /\bIP:\s*([0-9]{1,3}(?:\.[0-9]{1,3}){3})\b/i;
    const set = new Set<string>();
    for (const asset of assets) {
      if (asset.ip_address?.trim()) {
        set.add(asset.ip_address.trim());
      }
      const notes = asset.notes?.trim();
      if (!notes) continue;
      const match = notes.match(ipFromNotesRegex);
      if (match?.[1]) {
        set.add(match[1]);
      }
    }
    return set;
  }, [assets]);

  const existingHostnames = useMemo(() => {
    const set = new Set<string>();
    for (const asset of assets) {
      const normalized = normalizeHost(asset.name);
      if (normalized) set.add(normalized);
    }
    return set;
  }, [assets]);

  function isDeviceSaved(device: DiscoveredDevice): boolean {
    const host = normalizeHost(device.hostname);
    return existingIps.has(device.ip_address) || (host !== "" && existingHostnames.has(host));
  }

  async function runNetworkScan() {
    if (!selectedSiteId || isScanning) return;

    setIsScanning(true);
    setScanError("");
    setSaveError("");
    setDiscoveredDevices([]);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subnet: subnet.trim(),
          site_id: Number(selectedSiteId),
        }),
      });

      if (!response.ok) {
        throw new Error("Scan failed");
      }

      const data = (await response.json()) as DiscoveredDevice[];
      setDiscoveredDevices(Array.isArray(data) ? data : []);
      await loadScans();
      await loadAssets();
    } catch {
      setScanError("Unable to scan network right now.");
    } finally {
      setIsScanning(false);
    }
  }

  async function saveDiscoveredDevice(device: DiscoveredDevice) {
    if (!selectedSiteId || isDeviceSaved(device)) return;

    setSaveError("");
    setSavingIps((current) => [...current, device.ip_address]);

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: 1,
          site_id: Number(selectedSiteId),
          name: device.hostname?.trim() || device.ip_address,
          type: "Other",
          serial_number: "",
          status: "Active",
          notes: `Discovered by network scan. IP: ${device.ip_address}, MAC: ${device.mac_address || ""}, Manufacturer: ${device.manufacturer || ""}`,
        }),
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

  return (
    <main className="page scan-page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Network Scan</h1>
          <p className="page__subtle">
            Discover devices on a subnet and save them into SiteScope inventory.
          </p>
        </div>
      </header>

      <section className="card scan-console" aria-labelledby="scan-console-title">
        <header className="scan-console__header">
          <p className="site-section-kicker">Discovery console</p>
          <h2 id="scan-console-title" className="site-section-title">
            Scan configuration
          </h2>
          <p className="site-section-lead">
            Choose a site, run a subnet scan, and quickly commit discovered hosts into assets.
          </p>
        </header>

        {sitesLoading ? (
          <p className="status">Loading sites…</p>
        ) : sitesError ? (
          <p className="error">{sitesError}</p>
        ) : sites.length === 0 ? (
          <p className="status">No sites found. Create a site before running scans.</p>
        ) : (
          <>
            <div className="scan-form-grid">
              <label className="form-field">
                <span className="form-label">Client</span>
                <select
                  className="form-input"
                  value={selectedClientId}
                  onChange={(event) => setSelectedClientId(event.target.value)}
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Site</span>
                <select
                  className="form-input"
                  value={selectedSiteId}
                  onChange={(event) => {
                    const nextSiteId = event.target.value;
                    setSelectedSiteId(nextSiteId);
                    const nextSite = sites.find((site) => String(site.id) === nextSiteId);
                    if (nextSite) {
                      setSubnet(extractSubnetOrDefault(nextSite.address));
                    }
                  }}
                >
                  {sitesForSelectedClient.map((site) => {
                    const clientName =
                      clients.find((client) => client.id === site.client_id)?.name ?? "Client";
                    return (
                      <option key={site.id} value={site.id}>
                        {site.name} ({clientName})
                      </option>
                    );
                  })}
                  {sitesForSelectedClient.length === 0 ? (
                    <option value="2">Fallback site #2</option>
                  ) : null}
                </select>
              </label>

              <label className="form-field">
                <span className="form-label">Subnet (CIDR)</span>
                <input
                  type="text"
                  className="form-input"
                  value={subnet}
                  onChange={(event) => setSubnet(event.target.value)}
                  placeholder="192.168.10.0/24"
                />
              </label>

              <div className="scan-form-grid__actions">
                <button
                  type="button"
                  className="btn scan-console__scan-btn"
                  onClick={runNetworkScan}
                  disabled={isScanning || !selectedSiteId}
                >
                  {isScanning ? "Scanning…" : "Scan Network"}
                </button>
              </div>
            </div>

            {selectedSite ? (
              <p className="scan-console__context">
                Target site: <strong>{selectedSite.name}</strong>
                {selectedClientName ? ` (${selectedClientName})` : ""}
                {assetsLoading ? " · refreshing assets…" : ""}
              </p>
            ) : null}

            {scanError ? <p className="error">{scanError}</p> : null}
            {saveError ? <p className="error">{saveError}</p> : null}
          </>
        )}
      </section>

      <section className="card table-wrap" aria-labelledby="discovered-devices-title">
        <header className="form-card__head">
          <p className="site-section-kicker">Results</p>
          <h2 id="discovered-devices-title" className="site-section-title">
            Discovered devices
          </h2>
          <p className="site-section-lead">
            Review host identities and save new devices to your selected site inventory.
          </p>
        </header>

        {isScanning ? (
          <p className="status">Scanning network…</p>
        ) : discoveredDevices.length === 0 ? (
          <div className="empty-state">
            <p className="status">No scan results yet.</p>
            <p className="site-section-lead">
              Choose a target and run Network Scan to discover hosts on the selected subnet.
            </p>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={runNetworkScan}>
                Run Network Scan
              </button>
            </div>
          </div>
        ) : (
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
              {discoveredDevices.map((device) => {
                const saved = isDeviceSaved(device);
                return (
                  <tr key={`${device.ip_address}-${device.hostname}`}>
                    <td>{device.ip_address}</td>
                    <td className="hidden md:table-cell">{device.mac_address || "—"}</td>
                    <td>{device.hostname || "—"}</td>
                    <td className="hidden md:table-cell">{device.manufacturer || "—"}</td>
                    <td>
                      {saved ? (
                        <span className="site-scan-saved">Already saved ✓</span>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary w-full md:w-auto"
                          onClick={() => saveDiscoveredDevice(device)}
                          disabled={savingIps.includes(device.ip_address)}
                        >
                          {savingIps.includes(device.ip_address)
                            ? "Saving…"
                            : "Save as Asset"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="card table-wrap site-history-card" aria-labelledby="scan-history-title">
        <header className="site-history-card__head">
          <p className="site-section-kicker">Audit trail</p>
          <h2 id="scan-history-title" className="site-section-title">
            Scan History
          </h2>
          <p className="site-section-lead">
            Recent scans for the selected site.
          </p>
        </header>

        {!selectedSiteId ? (
          <p className="status">Select a site to load scan history.</p>
        ) : scansLoading ? (
          <p className="status">Loading scan history…</p>
        ) : scansError ? (
          <p className="error">{scansError}</p>
        ) : scans.length === 0 ? (
          <div className="empty-state">
            <p className="status">No scan history for this site yet.</p>
            <p className="site-section-lead">
              Start by running your first scan to build historical records.
            </p>
          </div>
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
