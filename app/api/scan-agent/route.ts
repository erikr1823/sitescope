import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

type ScanDevice = {
  ip?: string;
  mac?: string;
  hostname?: string;
  manufacturer?: string;
};

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");

  if (!process.env.SCAN_AGENT_API_KEY) {
    return NextResponse.json(
      { error: "SCAN_AGENT_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== process.env.SCAN_AGENT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const siteId = Number(body.site_id);
    const subnet = String(body.subnet || "").trim();
    const devices: ScanDevice[] = Array.isArray(body.devices)
      ? body.devices
      : [];

    if (!Number.isFinite(siteId) || siteId <= 0) {
      return NextResponse.json(
        { error: "Valid site_id is required" },
        { status: 400 }
      );
    }

    if (!subnet) {
      return NextResponse.json(
        { error: "subnet is required" },
        { status: 400 }
      );
    }

    const siteRows = await sql(
      "SELECT id, client_id FROM sites WHERE id = $1",
      [siteId]
    );

    if (siteRows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const clientId = siteRows[0].client_id;

    const createdScan = await sql(
      `INSERT INTO scans (site_id, subnet, devices_found, scanned_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [siteId, subnet, devices.length, "scan_agent.py"]
    );

    let inserted = 0;
    let skipped = 0;

    for (const device of devices) {
      const ip = String(device.ip || "").trim();
      const mac = String(device.mac || "").trim();
      const hostname = String(device.hostname || "").trim();
      const manufacturer = String(device.manufacturer || "").trim();

      if (!ip && !mac && !hostname) {
        skipped++;
        continue;
      }

      const assetName = hostname || ip || mac || "Unknown device";
      const serialNumber = mac || ip || assetName;

      const existing = await sql(
        `SELECT id FROM assets
         WHERE site_id = $1
         AND serial_number = $2
         LIMIT 1`,
        [siteId, serialNumber]
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const notes = [
        "Discovered by scan_agent.py",
        `Subnet: ${subnet}`,
        ip ? `IP: ${ip}` : "",
        mac ? `MAC: ${mac}` : "",
        hostname ? `Hostname: ${hostname}` : "",
        manufacturer ? `Manufacturer: ${manufacturer}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await sql(
        `INSERT INTO assets (client_id, site_id, name, type, serial_number, status, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          clientId,
          siteId,
          assetName,
          "Network Device",
          serialNumber,
          "Discovered",
          notes,
        ]
      );

      inserted++;
    }

    return NextResponse.json({
      success: true,
      scan: createdScan[0],
      devices_received: devices.length,
      inserted,
      skipped,
    });
  } catch (error) {
    console.error("scan-agent error:", error);

    return NextResponse.json(
      { error: "Failed to process scan agent payload" },
      { status: 500 }
    );
  }
}
