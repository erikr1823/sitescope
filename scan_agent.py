import os
import sys

import nmap
import requests
from dotenv import load_dotenv

load_dotenv()

SITESCOPE_URL = os.getenv("SITESCOPE_URL", "http://localhost:3000")
API_KEY = os.getenv("SCAN_AGENT_API_KEY")
SITE_ID = int(os.getenv("SITE_ID", "1"))


def scan(subnet):
    nm = nmap.PortScanner()
    print(f"Scanning {subnet}...")
    nm.scan(hosts=subnet, arguments="-sn")

    devices = []

    for host in nm.all_hosts():
        info = nm[host]
        addresses = info.get("addresses") or {}
        mac = addresses.get("mac", "")

        hostname = info.hostname() or ""
        vendor_map = info.get("vendor") or {}
        if not isinstance(vendor_map, dict):
            vendor_map = {}

        devices.append(
            {
                "ip": host,
                "hostname": hostname,
                "mac": mac,
                "manufacturer": vendor_map.get(mac, ""),
            }
        )

    return devices


def post(subnet, devices):
    if not API_KEY:
        print("Missing SCAN_AGENT_API_KEY in .env")
        return

    response = requests.post(
        f"{SITESCOPE_URL}/api/scan-agent",
        json={
            "site_id": SITE_ID,
            "subnet": subnet,
            "devices": devices,
        },
        headers={"x-api-key": API_KEY},
    )

    print(f"Posted {len(devices)} devices — status {response.status_code}")
    print(response.text)


subnet = sys.argv[1] if len(sys.argv) > 1 else "192.168.1.0/24"

devices = scan(subnet)
post(subnet, devices)
