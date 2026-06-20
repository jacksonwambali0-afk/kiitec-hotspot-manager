# KIITEC Setup — Quick Reference Checklist

Use this checklist to track your progress through the MikroTik and connector setup.

## Phase 1: MikroTik Configuration ✅

### API User Setup
- [ ] Created user `connector` on MikroTik
- [ ] Set strong password for `connector` user
- [ ] Assigned to `api` group
- [ ] Verified permissions: api, read, write, reboot, test

### API Service Configuration
- [ ] API (port 8728) is enabled
- [ ] API is reachable over WireGuard tunnel
- [ ] Firewall rules allow API traffic from VPS

### WireGuard Setup
- [ ] Created WireGuard interface `wg-connector`
- [ ] Added VPS as WireGuard peer
- [ ] Assigned IP `10.10.0.1/24` to WireGuard interface
- [ ] WireGuard tunnel is active (non-zero Rx/Tx bytes)

### Hotspot Configuration
- [ ] Hotspot server created and enabled
- [ ] IP pool configured for hotspot users
- [ ] User profiles set up (bandwidth limits, etc.)

---

## Phase 2: Dashboard Setup ✅

### Connector Token
- [ ] Generated connector token in Dashboard Settings
- [ ] Token format: `kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- [ ] Token saved securely (shown only once)

---

## Phase 3: VPS Agent Installation ✅

### Agent Installation
- [ ] Created `kiitec` system user
- [ ] Created `/opt/kiitec-connector` directory
- [ ] Copied `agent.py` and `requirements.txt`
- [ ] Created Python virtual environment
- [ ] Installed dependencies: `routeros_api`, `requests`

### Configuration
- [ ] Created `/etc/kiitec-connector.env`
- [ ] Set `KIITEC_SYNC_URL` (your dashboard endpoint)
- [ ] Set `KIITEC_CONNECTOR_TOKEN` (from Step 2)
- [ ] Set `MIKROTIK_HOST=10.10.0.1`
- [ ] Set `MIKROTIK_PORT=8728`
- [ ] Set `MIKROTIK_USER=connector`
- [ ] Set `MIKROTIK_PASSWORD` (from Step 1)
- [ ] Set `KIITEC_INTERVAL_SECONDS=20`
- [ ] Set file permissions: `chmod 600 /etc/kiitec-connector.env`

### Service Setup
- [ ] Copied `kiitec-connector.service` to `/etc/systemd/system/`
- [ ] Enabled service: `systemctl enable kiitec-connector`
- [ ] Started service: `systemctl start kiitec-connector`
- [ ] Service is running: `systemctl status kiitec-connector`

---

## Phase 4: Verification ✅

### Agent Health
- [ ] Agent logs show successful syncs: `journalctl -u kiitec-connector -f`
- [ ] No connection errors in logs
- [ ] Sync count shows: `synced: X users, wg=true, 0 command(s)`

### Dashboard Connectivity
- [ ] Router Monitor shows live data (CPU, memory, disk, uptime)
- [ ] WireGuard status shows **Connected**
- [ ] Last sync timestamp is recent (within 20-40 seconds)
- [ ] Hotspot active users count is accurate

### Hotspot Functionality
- [ ] Test device can connect to hotspot WiFi
- [ ] Test device is redirected to login page
- [ ] Session appears in Dashboard Active Sessions
- [ ] Session shows correct IP, MAC, and username

### Command Testing
- [ ] Tested disconnect user from dashboard
- [ ] User was disconnected on router
- [ ] Dashboard reboot button works (if tested)

---

## Phase 5: Production Readiness ✅

### Security
- [ ] Connector user has least-privilege permissions
- [ ] WireGuard tunnel is encrypted and secured
- [ ] API port only accessible over WireGuard
- [ ] Configuration file permissions are 600
- [ ] No sensitive data in logs

### Monitoring
- [ ] Agent logs are being monitored
- [ ] Dashboard shows real-time metrics
- [ ] Alerts configured (if available)

### Backup & Documentation
- [ ] Saved connector token securely
- [ ] Documented custom MikroTik configuration
- [ ] Backed up agent config
- [ ] Created runbook for troubleshooting

---

## Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| `Connection refused` | Check WireGuard tunnel status, verify API port 8728 is open |
| `Unauthorized token` | Verify token in `/etc/kiitec-connector.env` matches dashboard |
| `Invalid credentials` | Confirm `connector` password is correct in MikroTik and agent config |
| `Sessions not appearing` | Verify hotspot is enabled, check `/ip/hotspot/active` on router |
| `Last sync is old` | Check agent status: `systemctl status kiitec-connector`, review logs |
| `WireGuard shows disconnected` | Check peer configuration, verify public keys match |

---

## Support Information

- **Agent Logs**: `sudo journalctl -u kiitec-connector -f`
- **Agent Config**: `/etc/kiitec-connector.env`
- **MikroTik API Check**: `ping 10.10.0.1` from VPS
- **Service Restart**: `sudo systemctl restart kiitec-connector`
- **Service Reload**: `sudo systemctl reload kiitec-connector`

---

## Notes

_Use this space to document your specific setup details:_

```
Dashboard URL: _______________________________
VPS IP Address: _______________________________
MikroTik IP (WireGuard): 10.10.0.1
WireGuard Port: _______________________________
Connector User: connector
API Port: 8728
Sync Interval: 20 seconds
```
