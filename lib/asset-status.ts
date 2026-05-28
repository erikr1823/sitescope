export function assetStatusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") return "asset-status-badge asset-status-badge--active";
  if (normalized === "discovered") return "asset-status-badge asset-status-badge--discovered";
  if (normalized === "inactive" || normalized === "retired" || normalized === "offline") {
    return "asset-status-badge asset-status-badge--inactive";
  }
  if (normalized === "repair" || normalized === "maintenance") {
    return "asset-status-badge asset-status-badge--repair";
  }

  return "asset-status-badge";
}
