export function parseNetworkFromNotes(notes?: string | null): {
  ip: string | null;
  mac: string | null;
} {
  if (!notes?.trim()) {
    return { ip: null, mac: null };
  }

  const ipMatch =
    notes.match(/\bIP[:\s]+(\d{1,3}(?:\.\d{1,3}){3})\b/i) ??
    notes.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);

  const macMatch = notes.match(
    /\bMAC[:\s]+([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\b/i
  );

  return {
    ip: ipMatch?.[1] ?? null,
    mac: macMatch?.[1]?.toUpperCase() ?? null,
  };
}
