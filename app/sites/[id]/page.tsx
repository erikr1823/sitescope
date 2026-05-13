"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
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

type SiteNetworkSnapshot = {
  site_id?: number;
  isp?: string | null;
  corp_ssid?: string | null;
  guest_ssid?: string | null;
  ap_total?: number | null;
  ap_online?: number | null;
  device_count?: number | null;
  last_speed_down?: number | null;
  last_speed_up?: number | null;
  updated_at?: string | null;
};

type NetSnapshotEditKey =
  | "isp"
  | "corp_ssid"
  | "guest_ssid"
  | "aps"
  | "device_count"
  | "speed";

type SiteFollowup = {
  id: number;
  site_id: number;
  status: string;
  item_text: string;
  is_complete: boolean;
  created_at: string | null;
};

type FollowupUiStatus = "green" | "yellow" | "red";

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

const netSnapshotRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 170px) 1fr",
  gap: "10px 18px",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid var(--border)",
};

const netSnapshotLabelStyle: CSSProperties = {
  margin: 0,
  color: "var(--text-muted)",
  fontSize: "0.82rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const netSnapshotInputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text)",
  fontSize: "0.92rem",
};

const netSnapshotValueButtonStyle: CSSProperties = {
  margin: 0,
  padding: "8px 10px",
  borderRadius: "10px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(15, 23, 42, 0.35)",
  color: "var(--text)",
  textAlign: "left",
  width: "100%",
  cursor: "pointer",
  fontSize: "0.95rem",
  wordBreak: "break-word",
  lineHeight: 1.45,
};

function displayNetSnapshotText(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "Not set";
  return String(value);
}

function displayNetSnapshotMbps(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

function displayNetSnapshotApRatio(
  online: number | null | undefined,
  total: number | null | undefined
): string {
  const o =
    online != null && Number.isFinite(Number(online)) ? String(Number(online)) : "—";
  const t = total != null && Number.isFinite(Number(total)) ? String(Number(total)) : "—";
  if (o === "—" && t === "—") return "Not set";
  return `${o} / ${t}`;
}

function displayNetSnapshotDeviceLine(snapshot: SiteNetworkSnapshot | null): string {
  const n = snapshot?.device_count;
  if (n == null || !Number.isFinite(Number(n))) return "Not set";
  return String(Number(n));
}

function displayNetSnapshotSpeedLine(snapshot: SiteNetworkSnapshot | null): string {
  if (!snapshot) return "Not set";
  const ds = displayNetSnapshotMbps(snapshot.last_speed_down);
  const us = displayNetSnapshotMbps(snapshot.last_speed_up);
  if (ds === "—" && us === "—") return "Not set";
  return `${ds} / ${us} Mbps`;
}

function followUpStatusDotColor(status: string): string {
  const s = status.trim().toLowerCase();
  if (s === "green") return "#22c55e";
  if (s === "yellow") return "#eab308";
  if (s === "red") return "#ef4444";
  return "#64748b";
}

function sortFollowUpsList(list: SiteFollowup[]): SiteFollowup[] {
  return [...list].sort((a, b) => {
    if (a.is_complete !== b.is_complete) {
      return a.is_complete ? 1 : -1;
    }
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return b.id - a.id;
  });
}

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
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [manualAsset, setManualAsset] = useState({
    name: "",
    type: "Other",
    serial_number: "",
    status: "Active",
    notes: "",
  });

  const [netSnapshot, setNetSnapshot] = useState<SiteNetworkSnapshot | null>(null);
  const [netSnapshotLoading, setNetSnapshotLoading] = useState(true);
  const [netSnapshotError, setNetSnapshotError] = useState("");
  const [netSnapshotSaving, setNetSnapshotSaving] = useState(false);
  const [netSnapshotFieldError, setNetSnapshotFieldError] = useState("");
  const [netSnapshotEditing, setNetSnapshotEditing] = useState<NetSnapshotEditKey | null>(null);
  const [netSnapshotDraftText, setNetSnapshotDraftText] = useState("");
  const [netSnapshotDraftApOn, setNetSnapshotDraftApOn] = useState("");
  const [netSnapshotDraftApTot, setNetSnapshotDraftApTot] = useState("");
  const [netSnapshotDraftDevice, setNetSnapshotDraftDevice] = useState("");
  const [netSnapshotDraftDown, setNetSnapshotDraftDown] = useState("");
  const [netSnapshotDraftUp, setNetSnapshotDraftUp] = useState("");

  const [followUps, setFollowUps] = useState<SiteFollowup[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(true);
  const [followUpsError, setFollowUpsError] = useState("");
  const [followUpAddError, setFollowUpAddError] = useState("");
  const [followUpAddSaving, setFollowUpAddSaving] = useState(false);
  const [followUpToggleError, setFollowUpToggleError] = useState("");
  const [newFollowUpText, setNewFollowUpText] = useState("");
  const [newFollowUpStatus, setNewFollowUpStatus] =
    useState<FollowupUiStatus>("yellow");

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

  const loadNetSnapshot = useCallback(async () => {
    if (!siteId) {
      setNetSnapshotLoading(false);
      return;
    }

    setNetSnapshotLoading(true);
    setNetSnapshotError("");

    try {
      const response = await fetch(
        `/api/sites/${encodeURIComponent(siteId)}/snapshot`
      );

      if (!response.ok) {
        throw new Error("Failed to load network snapshot");
      }

      const data = (await response.json()) as { snapshot: SiteNetworkSnapshot | null };
      setNetSnapshot(data.snapshot ?? null);
    } catch {
      setNetSnapshotError("Unable to load network snapshot right now.");
      setNetSnapshot(null);
    } finally {
      setNetSnapshotLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadNetSnapshot();
  }, [loadNetSnapshot]);

  const loadFollowUps = useCallback(async () => {
    if (!siteId) {
      setFollowUpsLoading(false);
      return;
    }

    setFollowUpsLoading(true);
    setFollowUpsError("");

    try {
      const response = await fetch(
        `/api/sites/${encodeURIComponent(siteId)}/followups`
      );

      if (!response.ok) {
        throw new Error("Failed to load follow-ups");
      }

      const data = (await response.json()) as { followups?: SiteFollowup[] };
      const rows = Array.isArray(data.followups) ? data.followups : [];
      setFollowUps(sortFollowUpsList(rows));
    } catch {
      setFollowUpsError("Unable to load follow-up items right now.");
      setFollowUps([]);
    } finally {
      setFollowUpsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  async function patchNetSnapshot(patch: Record<string, unknown>): Promise<boolean> {
    if (!siteId) return false;

    setNetSnapshotSaving(true);
    setNetSnapshotFieldError("");

    try {
      const response = await fetch(
        `/api/sites/${encodeURIComponent(siteId)}/snapshot`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );

      const data = (await response.json()) as {
        snapshot?: SiteNetworkSnapshot;
        error?: string;
      };

      if (!response.ok) {
        setNetSnapshotFieldError(data.error ?? "Unable to save network snapshot.");
        return false;
      }

      if (data.snapshot) {
        setNetSnapshot(data.snapshot);
      }
      return true;
    } catch {
      setNetSnapshotFieldError("Unable to save network snapshot.");
      return false;
    } finally {
      setNetSnapshotSaving(false);
    }
  }

  function beginNetSnapshotEdit(key: NetSnapshotEditKey) {
    if (netSnapshotSaving) return;
    setNetSnapshotFieldError("");
    setNetSnapshotEditing(key);

    if (key === "isp") {
      setNetSnapshotDraftText(netSnapshot?.isp?.trim() ?? "");
    } else if (key === "corp_ssid") {
      setNetSnapshotDraftText(netSnapshot?.corp_ssid?.trim() ?? "");
    } else if (key === "guest_ssid") {
      setNetSnapshotDraftText(netSnapshot?.guest_ssid?.trim() ?? "");
    } else if (key === "aps") {
      setNetSnapshotDraftApOn(
        netSnapshot?.ap_online != null && Number.isFinite(Number(netSnapshot.ap_online))
          ? String(Number(netSnapshot.ap_online))
          : ""
      );
      setNetSnapshotDraftApTot(
        netSnapshot?.ap_total != null && Number.isFinite(Number(netSnapshot.ap_total))
          ? String(Number(netSnapshot.ap_total))
          : ""
      );
    } else if (key === "device_count") {
      setNetSnapshotDraftDevice(
        netSnapshot?.device_count != null &&
          Number.isFinite(Number(netSnapshot.device_count))
          ? String(Number(netSnapshot.device_count))
          : ""
      );
    } else if (key === "speed") {
      setNetSnapshotDraftDown(
        netSnapshot?.last_speed_down != null &&
          Number.isFinite(Number(netSnapshot.last_speed_down))
          ? String(Number(netSnapshot.last_speed_down))
          : ""
      );
      setNetSnapshotDraftUp(
        netSnapshot?.last_speed_up != null &&
          Number.isFinite(Number(netSnapshot.last_speed_up))
          ? String(Number(netSnapshot.last_speed_up))
          : ""
      );
    }
  }

  function cancelNetSnapshotEdit() {
    setNetSnapshotEditing(null);
    setNetSnapshotFieldError("");
  }

  async function commitNetSnapshotText(
    field: "isp" | "corp_ssid" | "guest_ssid",
    draft: string
  ) {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : trimmed;
    const prev = netSnapshot?.[field];
    const prevNorm =
      prev == null || String(prev).trim() === "" ? null : String(prev).trim();
    if (prevNorm === next) {
      cancelNetSnapshotEdit();
      return;
    }
    const ok = await patchNetSnapshot({ [field]: next });
    if (ok) cancelNetSnapshotEdit();
  }

  async function commitNetSnapshotAps() {
    const parseIntOrNull = (raw: string): number | null | "invalid" => {
      const t = raw.trim();
      if (t === "") return null;
      const n = Number(t);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return "invalid";
      return n;
    };

    const on = parseIntOrNull(netSnapshotDraftApOn);
    const tot = parseIntOrNull(netSnapshotDraftApTot);
    if (on === "invalid" || tot === "invalid") {
      setNetSnapshotFieldError("AP counts must be whole numbers or empty.");
      return;
    }

    const prevOn = netSnapshot?.ap_online;
    const prevTot = netSnapshot?.ap_total;
    const sameOn =
      (prevOn == null && on == null) ||
      (prevOn != null && on != null && Number(prevOn) === on);
    const sameTot =
      (prevTot == null && tot == null) ||
      (prevTot != null && tot != null && Number(prevTot) === tot);

    if (sameOn && sameTot) {
      cancelNetSnapshotEdit();
      return;
    }

    const patch: Record<string, unknown> = {};
    if (!sameOn) patch.ap_online = on;
    if (!sameTot) patch.ap_total = tot;
    const ok = await patchNetSnapshot(patch);
    if (ok) cancelNetSnapshotEdit();
  }

  async function commitNetSnapshotDeviceCount() {
    const trimmed = netSnapshotDraftDevice.trim();
    let next: number | null;
    if (trimmed === "") {
      next = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        setNetSnapshotFieldError("Devices online must be a whole number or empty.");
        return;
      }
      next = n;
    }

    const prev = netSnapshot?.device_count;
    const prevNorm =
      prev == null || !Number.isFinite(Number(prev)) ? null : Number(prev);
    if (prevNorm === next) {
      cancelNetSnapshotEdit();
      return;
    }

    const ok = await patchNetSnapshot({ device_count: next });
    if (ok) cancelNetSnapshotEdit();
  }

  async function commitNetSnapshotSpeed() {
    const parseNumOrNull = (raw: string): number | null | "invalid" => {
      const t = raw.trim();
      if (t === "") return null;
      const n = Number(t);
      if (!Number.isFinite(n)) return "invalid";
      return n;
    };

    const down = parseNumOrNull(netSnapshotDraftDown);
    const up = parseNumOrNull(netSnapshotDraftUp);
    if (down === "invalid" || up === "invalid") {
      setNetSnapshotFieldError("Speed values must be numbers or empty.");
      return;
    }

    const prevDown = netSnapshot?.last_speed_down;
    const prevUp = netSnapshot?.last_speed_up;
    const prevDN =
      prevDown == null || !Number.isFinite(Number(prevDown)) ? null : Number(prevDown);
    const prevUN =
      prevUp == null || !Number.isFinite(Number(prevUp)) ? null : Number(prevUp);

    const sameDown =
      (prevDN == null && down == null) ||
      (prevDN != null && down != null && prevDN === down);
    const sameUp =
      (prevUN == null && up == null) || (prevUN != null && up != null && prevUN === up);

    if (sameDown && sameUp) {
      cancelNetSnapshotEdit();
      return;
    }

    const patch: Record<string, unknown> = {};
    if (!sameDown) patch.last_speed_down = down;
    if (!sameUp) patch.last_speed_up = up;
    const ok = await patchNetSnapshot(patch);
    if (ok) cancelNetSnapshotEdit();
  }

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

  async function saveManualAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteId || !manualAsset.name.trim() || manualSaving) return;

    setManualSaving(true);
    setManualError("");
    setManualSuccess("");
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: 1,
          site_id: Number(siteId),
          name: manualAsset.name.trim(),
          type: manualAsset.type.trim() || "Other",
          serial_number: manualAsset.serial_number,
          status: manualAsset.status.trim() || "Active",
          notes: manualAsset.notes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save manual asset");
      }

      setManualSuccess("Asset added to this site inventory.");
      setManualAsset({
        name: "",
        type: "Other",
        serial_number: "",
        status: "Active",
        notes: "",
      });
      await loadAssets();
    } catch {
      setManualError("Unable to add this asset right now.");
    } finally {
      setManualSaving(false);
    }
  }

  async function addFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!siteId || followUpAddSaving) return;

    const text = newFollowUpText.trim();
    if (!text) {
      setFollowUpAddError("Enter follow-up text.");
      return;
    }

    setFollowUpAddSaving(true);
    setFollowUpAddError("");

    try {
      const response = await fetch(
        `/api/sites/${encodeURIComponent(siteId)}/followups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_text: text,
            status: newFollowUpStatus,
          }),
        }
      );

      const data = (await response.json()) as {
        followup?: SiteFollowup;
        error?: string;
      };

      if (!response.ok) {
        setFollowUpAddError(data.error ?? "Could not add follow-up item.");
        return;
      }

      if (data.followup) {
        setFollowUps((list) => sortFollowUpsList([data.followup as SiteFollowup, ...list]));
      }
      setNewFollowUpText("");
      setNewFollowUpStatus("yellow");
    } catch {
      setFollowUpAddError("Could not add follow-up item.");
    } finally {
      setFollowUpAddSaving(false);
    }
  }

  async function toggleFollowUpComplete(item: SiteFollowup, nextComplete: boolean) {
    if (!siteId || item.is_complete === nextComplete) return;

    setFollowUpToggleError("");
    const previous = item;
    setFollowUps((list) =>
      list.map((f) => (f.id === item.id ? { ...f, is_complete: nextComplete } : f))
    );

    try {
      const response = await fetch(
        `/api/sites/${encodeURIComponent(siteId)}/followups/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_complete: nextComplete }),
        }
      );

      const data = (await response.json()) as {
        followup?: SiteFollowup;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Update failed");
      }

      if (data.followup) {
        setFollowUps((list) =>
          sortFollowUpsList(
            list.map((f) => (f.id === item.id ? (data.followup as SiteFollowup) : f))
          )
        );
      }
    } catch (err) {
      setFollowUps((list) =>
        list.map((f) => (f.id === item.id ? previous : f))
      );
      setFollowUpToggleError(
        err instanceof Error ? err.message : "Could not update follow-up item."
      );
    }
  }

  return (
    <main className="page site-page">
      <div className="page__header site-page__header">
        <div>
          <h1 className="page__title">Site Assets</h1>
          <p className="page__subtle">Asset inventory for this site.</p>
        </div>
        <div className="dashboard-hero__actions">
          <button type="button" className="btn" onClick={() => setManualFormOpen((v) => !v)}>
            {manualFormOpen ? "Close Manual Asset Form" : "Add Asset Manually"}
          </button>
          <Link href="/scan" className="btn-secondary shrink-0 max-md:w-full max-md:justify-center">
            Open Network Scan Console
          </Link>
          <Link href="/clients" className="btn btn--ghost shrink-0 max-md:w-full max-md:justify-center">
            Back to clients
          </Link>
        </div>
      </div>

      <section className="card" aria-labelledby="network-snapshot-title">
        <header className="form-card__head">
          <p className="site-section-kicker">Network posture</p>
          <h2 id="network-snapshot-title" className="site-section-title">
            Network Snapshot
          </h2>
          <p className="site-section-lead">
            Quick reference for connectivity, Wi‑Fi, access points, and last speed test results.
            Click any value to edit; press Enter or click away to save.
          </p>
        </header>

        {!siteId ? (
          <p className="status">Site ID is missing.</p>
        ) : netSnapshotLoading ? (
          <p className="status">Loading network snapshot…</p>
        ) : netSnapshotError ? (
          <p className="error">{netSnapshotError}</p>
        ) : (
          <>
            {netSnapshotFieldError ? <p className="error">{netSnapshotFieldError}</p> : null}

            <div style={{ display: "grid", gap: 0 }}>
              <div style={netSnapshotRowStyle}>
                <p style={netSnapshotLabelStyle}>ISP</p>
                {netSnapshotEditing === "isp" ? (
                  <input
                    style={netSnapshotInputStyle}
                    value={netSnapshotDraftText}
                    onChange={(e) => setNetSnapshotDraftText(e.target.value)}
                    onBlur={(e) => void commitNetSnapshotText("isp", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelNetSnapshotEdit();
                      }
                    }}
                    disabled={netSnapshotSaving}
                    autoFocus
                    aria-label="ISP"
                  />
                ) : (
                  <button
                    type="button"
                    style={netSnapshotValueButtonStyle}
                    onClick={() => beginNetSnapshotEdit("isp")}
                    disabled={netSnapshotSaving}
                  >
                    {displayNetSnapshotText(netSnapshot?.isp)}
                  </button>
                )}
              </div>

              <div style={netSnapshotRowStyle}>
                <p style={netSnapshotLabelStyle}>Corp SSID</p>
                {netSnapshotEditing === "corp_ssid" ? (
                  <input
                    style={netSnapshotInputStyle}
                    value={netSnapshotDraftText}
                    onChange={(e) => setNetSnapshotDraftText(e.target.value)}
                    onBlur={(e) => void commitNetSnapshotText("corp_ssid", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelNetSnapshotEdit();
                      }
                    }}
                    disabled={netSnapshotSaving}
                    autoFocus
                    aria-label="Corporate SSID"
                  />
                ) : (
                  <button
                    type="button"
                    style={netSnapshotValueButtonStyle}
                    onClick={() => beginNetSnapshotEdit("corp_ssid")}
                    disabled={netSnapshotSaving}
                  >
                    {displayNetSnapshotText(netSnapshot?.corp_ssid)}
                  </button>
                )}
              </div>

              <div style={netSnapshotRowStyle}>
                <p style={netSnapshotLabelStyle}>Guest SSID</p>
                {netSnapshotEditing === "guest_ssid" ? (
                  <input
                    style={netSnapshotInputStyle}
                    value={netSnapshotDraftText}
                    onChange={(e) => setNetSnapshotDraftText(e.target.value)}
                    onBlur={(e) => void commitNetSnapshotText("guest_ssid", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelNetSnapshotEdit();
                      }
                    }}
                    disabled={netSnapshotSaving}
                    autoFocus
                    aria-label="Guest SSID"
                  />
                ) : (
                  <button
                    type="button"
                    style={netSnapshotValueButtonStyle}
                    onClick={() => beginNetSnapshotEdit("guest_ssid")}
                    disabled={netSnapshotSaving}
                  >
                    {displayNetSnapshotText(netSnapshot?.guest_ssid)}
                  </button>
                )}
              </div>

              <div style={netSnapshotRowStyle}>
                <p style={netSnapshotLabelStyle}>APs online</p>
                {netSnapshotEditing === "aps" ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "10px",
                    }}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        void commitNetSnapshotAps();
                      }
                    }}
                  >
                    <input
                      style={{ ...netSnapshotInputStyle, maxWidth: "120px" }}
                      inputMode="numeric"
                      value={netSnapshotDraftApOn}
                      onChange={(e) => setNetSnapshotDraftApOn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitNetSnapshotAps();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelNetSnapshotEdit();
                        }
                      }}
                      disabled={netSnapshotSaving}
                      autoFocus
                      aria-label="Access points online"
                    />
                    <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>/</span>
                    <input
                      style={{ ...netSnapshotInputStyle, maxWidth: "120px" }}
                      inputMode="numeric"
                      value={netSnapshotDraftApTot}
                      onChange={(e) => setNetSnapshotDraftApTot(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitNetSnapshotAps();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelNetSnapshotEdit();
                        }
                      }}
                      disabled={netSnapshotSaving}
                      aria-label="Access points total"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    style={netSnapshotValueButtonStyle}
                    onClick={() => beginNetSnapshotEdit("aps")}
                    disabled={netSnapshotSaving}
                  >
                    {displayNetSnapshotApRatio(netSnapshot?.ap_online, netSnapshot?.ap_total)}
                  </button>
                )}
              </div>

              <div style={netSnapshotRowStyle}>
                <p style={netSnapshotLabelStyle}>Devices online</p>
                {netSnapshotEditing === "device_count" ? (
                  <input
                    style={{ ...netSnapshotInputStyle, maxWidth: "160px" }}
                    inputMode="numeric"
                    value={netSnapshotDraftDevice}
                    onChange={(e) => setNetSnapshotDraftDevice(e.target.value)}
                    onBlur={() => void commitNetSnapshotDeviceCount()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelNetSnapshotEdit();
                      }
                    }}
                    disabled={netSnapshotSaving}
                    autoFocus
                    aria-label="Devices online count"
                  />
                ) : (
                  <button
                    type="button"
                    style={netSnapshotValueButtonStyle}
                    onClick={() => beginNetSnapshotEdit("device_count")}
                    disabled={netSnapshotSaving}
                  >
                    {displayNetSnapshotDeviceLine(netSnapshot)}
                  </button>
                )}
              </div>

              <div style={{ ...netSnapshotRowStyle, borderBottom: "none", paddingBottom: 0 }}>
                <p style={netSnapshotLabelStyle}>Last speed test</p>
                {netSnapshotEditing === "speed" ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "10px",
                    }}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        void commitNetSnapshotSpeed();
                      }
                    }}
                  >
                    <input
                      style={{ ...netSnapshotInputStyle, maxWidth: "130px" }}
                      inputMode="decimal"
                      value={netSnapshotDraftDown}
                      onChange={(e) => setNetSnapshotDraftDown(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitNetSnapshotSpeed();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelNetSnapshotEdit();
                        }
                      }}
                      disabled={netSnapshotSaving}
                      autoFocus
                      aria-label="Download Mbps"
                    />
                    <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>/</span>
                    <input
                      style={{ ...netSnapshotInputStyle, maxWidth: "130px" }}
                      inputMode="decimal"
                      value={netSnapshotDraftUp}
                      onChange={(e) => setNetSnapshotDraftUp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitNetSnapshotSpeed();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelNetSnapshotEdit();
                        }
                      }}
                      disabled={netSnapshotSaving}
                      aria-label="Upload Mbps"
                    />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Mbps</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    style={netSnapshotValueButtonStyle}
                    onClick={() => beginNetSnapshotEdit("speed")}
                    disabled={netSnapshotSaving}
                  >
                    {displayNetSnapshotSpeedLine(netSnapshot)}
                  </button>
                )}
              </div>
            </div>

            {netSnapshot?.updated_at ? (
              <p
                className="site-section-lead"
                style={{ marginTop: "14px", marginBottom: 0, fontSize: "0.82rem" }}
              >
                Last updated {formatScannedAt(netSnapshot.updated_at)}
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="card" aria-labelledby="follow-up-items-title">
        <header className="form-card__head">
          <p className="site-section-kicker">Action items</p>
          <h2 id="follow-up-items-title" className="site-section-title">
            Follow-Up Items
          </h2>
          <p className="site-section-lead">
            Track open work for this site. Status colors reflect urgency; mark items complete when
            resolved.
          </p>
        </header>

        {!siteId ? (
          <p className="status">Site ID is missing.</p>
        ) : followUpsLoading ? (
          <p className="status">Loading follow-up items…</p>
        ) : followUpsError ? (
          <p className="error">{followUpsError}</p>
        ) : (
          <>
            {followUpToggleError ? (
              <p className="error" style={{ marginBottom: "12px" }}>
                {followUpToggleError}
              </p>
            ) : null}

            <form
              className="form-stack"
              style={{ marginBottom: "18px" }}
              onSubmit={addFollowUp}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  alignItems: "flex-end",
                }}
              >
                <label className="form-field" style={{ margin: 0, flex: "1 1 220px" }}>
                  <span className="form-label">New item</span>
                  <input
                    className="form-input"
                    value={newFollowUpText}
                    onChange={(e) => setNewFollowUpText(e.target.value)}
                    placeholder="Describe the follow-up…"
                    disabled={followUpAddSaving}
                    aria-label="Follow-up text"
                  />
                </label>
                <label className="form-field" style={{ margin: 0, flex: "0 1 140px" }}>
                  <span className="form-label">Status</span>
                  <select
                    className="form-input"
                    style={filterToolbarControlStyle}
                    value={newFollowUpStatus}
                    onChange={(e) =>
                      setNewFollowUpStatus(e.target.value as FollowupUiStatus)
                    }
                    disabled={followUpAddSaving}
                    aria-label="Follow-up status"
                  >
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="red">Red</option>
                  </select>
                </label>
                <div className="form-actions" style={{ margin: 0 }}>
                  <button type="submit" className="btn" disabled={followUpAddSaving}>
                    {followUpAddSaving ? "Adding…" : "Add"}
                  </button>
                </div>
              </div>
              {followUpAddError ? <p className="error">{followUpAddError}</p> : null}
            </form>

            {followUps.length === 0 ? (
              <div className="empty-state">
                <p className="status">No follow-up items yet.</p>
                <p className="site-section-lead">
                  Add your first item above to track work for this site.
                </p>
              </div>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gap: "10px",
                }}
              >
                {followUps.map((item) => {
                  const complete = Boolean(item.is_complete);
                  return (
                    <li
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      <span
                        title={item.status}
                        aria-hidden
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "999px",
                          marginTop: "6px",
                          flexShrink: 0,
                          background: followUpStatusDotColor(item.status),
                          boxShadow: `0 0 0 2px rgba(15, 23, 42, 0.6)`,
                        }}
                      />
                      <p
                        style={{
                          margin: 0,
                          flex: 1,
                          minWidth: 0,
                          lineHeight: 1.45,
                          fontSize: "0.95rem",
                          color: complete ? "var(--text-muted)" : "var(--text)",
                          textDecoration: complete ? "line-through" : "none",
                          opacity: complete ? 0.85 : 1,
                        }}
                      >
                        {item.item_text}
                      </p>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          flexShrink: 0,
                          cursor: "pointer",
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={complete}
                          onChange={(e) =>
                            void toggleFollowUpComplete(item, e.target.checked)
                          }
                          aria-label={`Mark complete: ${item.item_text.slice(0, 80)}`}
                        />
                        <span className="hidden sm:inline">Done</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      {manualFormOpen ? (
        <section className="card" aria-labelledby="manual-asset-form-title">
          <header className="form-card__head">
            <p className="site-section-kicker">Inventory input</p>
            <h2 id="manual-asset-form-title" className="site-section-title">
              Add asset manually
            </h2>
            <p className="site-section-lead">
              Enter asset details directly when a device is not coming from a network scan.
            </p>
          </header>
          <form className="form-stack" onSubmit={saveManualAsset}>
            <label className="form-field">
              <span className="form-label">Name</span>
              <input
                className="form-input"
                value={manualAsset.name}
                onChange={(event) =>
                  setManualAsset((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Type</span>
              <input
                className="form-input"
                value={manualAsset.type}
                onChange={(event) =>
                  setManualAsset((current) => ({ ...current, type: event.target.value }))
                }
              />
            </label>
            <label className="form-field">
              <span className="form-label">Serial Number</span>
              <input
                className="form-input"
                value={manualAsset.serial_number}
                onChange={(event) =>
                  setManualAsset((current) => ({
                    ...current,
                    serial_number: event.target.value,
                  }))
                }
              />
            </label>
            <label className="form-field">
              <span className="form-label">Status</span>
              <input
                className="form-input"
                value={manualAsset.status}
                onChange={(event) =>
                  setManualAsset((current) => ({ ...current, status: event.target.value }))
                }
              />
            </label>
            <label className="form-field">
              <span className="form-label">Notes</span>
              <textarea
                className="form-input"
                value={manualAsset.notes}
                onChange={(event) =>
                  setManualAsset((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
            {manualError ? <p className="error">{manualError}</p> : null}
            {manualSuccess ? <p className="status">{manualSuccess}</p> : null}
            <div className="form-actions">
              <button className="btn" type="submit" disabled={manualSaving}>
                {manualSaving ? "Saving…" : "Save Asset"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

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
          <div className="site-inventory-card__head-row">
            <div>
              <p className="site-section-kicker">Inventory</p>
              <h2 id="site-inventory-title" className="site-section-title">
                Site assets
              </h2>
              <p className="site-section-lead">
                Search and filter the asset register for this site. Results update as you type;
                type filters apply together with search.
              </p>
            </div>
            <button
              type="button"
              className="btn site-inventory-card__export-btn"
              onClick={exportAssetsCsv}
            >
              Export CSV
            </button>
          </div>
        </header>

        {isLoading ? (
          <p className="status">Loading assets…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : assets.length === 0 ? (
          <div className="empty-state">
            <p className="status">No assets found for this site.</p>
            <p className="site-section-lead">
              Run a scan or add an asset manually to start this site's inventory.
            </p>
            <div className="form-actions">
              <button type="button" className="btn" onClick={() => setManualFormOpen(true)}>
                Add Asset Manually
              </button>
              <Link href="/scan" className="btn-secondary">
                Open Network Scan
              </Link>
            </div>
          </div>
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
                      <td>
                        <Link href={`/assets/${asset.id}`} className="asset-link">
                          {asset.name}
                        </Link>
                      </td>
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
          <div className="empty-state">
            <p className="status">No scan history for this site yet.</p>
            <p className="site-section-lead">
              Run a network scan to start building a discovery history for this site.
            </p>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowScanner(true)}>
                Open Site Scanner
              </button>
            </div>
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
