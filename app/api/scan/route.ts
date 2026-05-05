import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

type ScanRequestBody = {
  subnet?: string;
  site_id?: number;
};

const mockDevices = [
  {
    ip_address: "192.168.10.10",
    mac_address: "00:15:5D:01:0A:01",
    hostname: "win-server.lab",
    manufacturer: "Microsoft",
  },
  {
    ip_address: "192.168.10.11",
    mac_address: "00:15:5D:01:0A:0B",
    hostname: "win11.lab",
    manufacturer: "Microsoft",
  },
  {
    ip_address: "192.168.10.20",
    mac_address: "",
    hostname: "ubuntu-lab",
    manufacturer: "Linux",
  },
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScanRequestBody;
    const subnet = body?.subnet?.trim();
    const siteId = Number(body?.site_id);

    if (!subnet || !Number.isFinite(siteId) || siteId <= 0) {
      return NextResponse.json(
        { error: "subnet and site_id are required" },
        { status: 400 }
      );
    }

    await sql(
      `INSERT INTO scans (site_id, subnet, devices_found, scanned_by)
       VALUES ($1, $2, $3, $4)`,
      [siteId, subnet, mockDevices.length, "mock-scanner"]
    );

    return NextResponse.json(mockDevices);
  } catch {
    return NextResponse.json(
      { error: "Failed to run scan" },
      { status: 500 }
    );
  }
}
