# KIITEC Hotspot — VPS Connector

The connector is a tiny Python service that runs on your **Ubuntu VPS** (the same
machine that terminates the WireGuard tunnel from the RB951). It is the only
component that talks to the MikroTik API directly — the dashboard in the cloud
never reaches the router. Instead, the connector **pushes** telemetry and
**pulls** commands from the dashboard over HTTPS.

```text
RB951 (hotspot)  ──WireGuard──▶  Ubuntu VPS  ──HTTPS──▶  KIITEC dashboard (cloud)
   RouterOS API        tunnel       agent.py     /api/public/connector/sync
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

### 2. Install on the VPS

```bash
sudo useradd -r -s /usr/sbin/nologin kiitec || true
sudo mkdir -p /opt/kiitec-connector
sudo cp agent.py requirements.txt /opt/kiitec-connector/
cd /opt/kiitec-connector
sudo python3 -m venv venv
sudo ./venv/bin/pip install -r requirements.txt
sudo chown -R kiitec:kiitec /opt/kiitec-connector
```

### 3. Configure the environment

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
