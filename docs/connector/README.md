# KIITEC Hotspot — PC/VPS Connector

The connector is a tiny Python service that runs on your **Windows PC or Ubuntu
VPS** as long as that machine can reach the RB951 RouterOS API. It is the only
component that talks to the MikroTik API directly — the dashboard in the cloud
never reaches the router. Instead, the connector **pushes** telemetry and
**pulls** commands from the dashboard over HTTPS.

```text
RB951 (hotspot)  ──LAN/WireGuard──▶  Windows PC/VPS  ──HTTPS──▶  KIITEC dashboard
   RouterOS API          tunnel/LAN      agent.py       /api/public/connector/sync
```

## What it does every ~20s

1. Reads RouterOS health (CPU, memory, disk, uptime, version).
2. Reads active hotspot sessions (user, IP, MAC, data usage).
3. Checks the WireGuard peer handshake.
4. POSTs all of it to `/api/public/connector/sync` with the connector token.
5. Runs any commands the dashboard queued (disconnect a user, reboot, …) and
   reports the result back.

## Setup

### 1. Generate a connector token
In the dashboard: **Settings → Connector token → Generate token**. Copy it now —
it is shown only once (only its hash is stored).

### 2. Install on Windows PC

```powershell
cd C:\Users\fivia\Downloads\kiitec-hotspot-manager-main\docs\connector
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

Create or edit `.env` in the same folder, then run:

```powershell
.\venv\Scripts\python agent.py
```

### 3. Install on an Ubuntu VPS

```bash
sudo useradd -r -s /usr/sbin/nologin kiitec || true
sudo mkdir -p /opt/kiitec-connector
sudo cp agent.py requirements.txt /opt/kiitec-connector/
cd /opt/kiitec-connector
sudo python3 -m venv venv
sudo ./venv/bin/pip install -r requirements.txt
sudo chown -R kiitec:kiitec /opt/kiitec-connector
```

### 4. Configure the environment

Create `/etc/kiitec-connector.env` (chmod 600, owned by root):

```ini
KIITEC_SYNC_URL=https://<your-app>.lovable.app/api/public/connector/sync
KIITEC_CONNECTOR_TOKEN=kc_xxxxxxxxxxxxxxxxxxxx
MIKROTIK_HOST=10.10.0.1
MIKROTIK_PORT=8728
MIKROTIK_USER=connector
MIKROTIK_PASSWORD=<routeros api password>
MIKROTIK_USE_TLS=false
KIITEC_INTERVAL_SECONDS=20
```

> Create a dedicated, least-privilege RouterOS user for the API (group with
> `api`, `read`, `write`, `reboot`, `test` as needed). Do not use `admin`.

### 4. Run as a service

```bash
sudo cp kiitec-connector.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kiitec-connector
sudo journalctl -u kiitec-connector -f
```

Within ~20 seconds the **Router Monitor**, **Active Sessions** and **WireGuard**
pages in the dashboard go live.

## Security notes

- The token authenticates the agent to the dashboard; rotate it any time from
  Settings (the old token stops working immediately).
- RouterOS is reachable only across the WireGuard tunnel — never expose the API
  port (8728/8729) to the public internet.
- The sync endpoint lives under `/api/public/*` and validates the token with a
  timing-safe comparison before doing anything.
