# KIITEC Setup — Quick Command Reference

Fast reference for common commands during setup and troubleshooting.

## MikroTik RouterOS (CLI)

### API User Management
```
# List all users
/user/print

# Create connector user
/user/add name=connector password=<strong-password> group=api

# Set user permissions
/user/set number=<user-number> group=api

# Remove user
/user/remove numbers=<user-number>

# Change password
/user/set numbers=<user-number> password=<new-password>
```

### API Service
```
# Check API status
/ip/service/print
/ip/service/enable api

# Set API port
/ip/service/set api port=8728

# Check if API is listening
:terminal
telnet 127.0.0.1 8728
quit
```

### WireGuard Interface
```
# Create WireGuard interface
/interface/wireguard/add name=wg-connector listen-port=51820

# List WireGuard interfaces
/interface/wireguard/print

# Add WireGuard peer
/interface/wireguard/peers/add interface=wg-connector public-key=<vps-public-key> allowed-address=10.10.1.0/24

# List peers
/interface/wireguard/peers/print

# Check WireGuard status (last handshake)
/interface/wireguard/peers/print detail
```

### IP Addresses
```
# Assign IP to WireGuard
/ip/address/add address=10.10.0.1/24 interface=wg-connector

# List all IP addresses
/ip/address/print

# Verify WireGuard IP
/ip/address/print where interface=wg-connector
```

### Hotspot Status
```
# List hotspot servers
/ip/hotspot/print

# Check active hotspot sessions
/ip/hotspot/active/print

# Detailed session info
/ip/hotspot/active/print detail

# Disconnect a specific user
/ip/hotspot/active/remove numbers=<session-number>

# List all users
/ip/hotspot/user/print

# Create hotspot user
/ip/hotspot/user/add name=testuser password=testpass123
```

### System Information
```
# Check system health
/system/resource/print

# Router identity
/system/identity/print

# System reboot
/system/reboot
```

### Firewall Rules (if needed)
```
# List firewall filter rules
/ip/firewall/filter/print

# Add rule to allow API from WireGuard
/ip/firewall/filter/add chain=input protocol=tcp dst-port=8728 in-interface=wg-connector action=accept place-before=0

# List NAT rules
/ip/firewall/nat/print

# Add masquerade for WireGuard
/ip/firewall/nat/add chain=srcnat out-interface=wg-connector action=masquerade
```

---

## Ubuntu VPS (Agent Installation & Management)

### User & Directory Setup
```bash
# Create kiitec system user
sudo useradd -r -s /usr/sbin/nologin kiitec

# Create agent directory
sudo mkdir -p /opt/kiitec-connector

# Copy files
sudo cp docs/connector/agent.py /opt/kiitec-connector/
sudo cp docs/connector/requirements.txt /opt/kiitec-connector/
sudo cp docs/connector/kiitec-connector.service /etc/systemd/system/

# Set ownership
sudo chown -R kiitec:kiitec /opt/kiitec-connector
```

### Python Virtual Environment
```bash
# Navigate to directory
cd /opt/kiitec-connector

# Create venv
sudo python3 -m venv venv

# Activate (for manual testing)
source venv/bin/activate

# Install dependencies
sudo ./venv/bin/pip install --upgrade pip
sudo ./venv/bin/pip install -r requirements.txt

# Verify installation
sudo ./venv/bin/python -c "import routeros_api; print('OK')"
```

### Configuration
```bash
# Create config file
sudo nano /etc/kiitec-connector.env

# Set permissions
sudo chmod 600 /etc/kiitec-connector.env
sudo chown root:root /etc/kiitec-connector.env

# View config (without showing token)
sudo grep -v TOKEN /etc/kiitec-connector.env
```

### Service Management
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable kiitec-connector

# Start service
sudo systemctl start kiitec-connector

# Check status
sudo systemctl status kiitec-connector

# Stop service
sudo systemctl stop kiitec-connector

# Restart service
sudo systemctl restart kiitec-connector

# View logs (last 50 lines)
sudo journalctl -u kiitec-connector -n 50

# Live logs (follow mode)
sudo journalctl -u kiitec-connector -f

# Logs from last hour
sudo journalctl -u kiitec-connector --since "1 hour ago"

# Logs with timestamps
sudo journalctl -u kiitec-connector --no-pager -o short-iso
```

### Debugging & Testing
```bash
# Test network path to MikroTik
ping 10.10.0.1

# Test API port connectivity
nc -zv 10.10.0.1 8728
# or
telnet 10.10.0.1 8728

# Test API with timeout
timeout 5 bash -c 'cat </dev/null >/dev/tcp/10.10.0.1/8728' && echo "API port open" || echo "API port closed"

# Check WireGuard interface
ip link show
ifconfig wg0  # if WireGuard interface exists
```

### Testing Agent Manually
```bash
# Load environment
export $(cat /etc/kiitec-connector.env | xargs)

# Run agent once (for debugging)
cd /opt/kiitec-connector
sudo -u kiitec ./venv/bin/python3 agent.py

# Test specific imports
sudo ./venv/bin/python3 << 'EOF'
import os
from dotenv import load_dotenv
load_dotenv('/etc/kiitec-connector.env')
import routeros_api
print("✓ routeros_api imported")
print("✓ All dependencies OK")
EOF
```

---

## Dashboard (Settings & Configuration)

### Generating Connector Token
```
1. Log into KIITEC Dashboard
2. Navigate to Settings (⚙️ icon)
3. Find "Connector Token" section
4. Click "Generate New Token"
5. Copy token immediately (format: kc_xxxxxxxxxxxx)
6. Store securely — shown only once
```

### Viewing Router Health
```
1. Dashboard Home → Router Monitor (or similar)
2. Should show:
   - CPU Load, Memory, Disk usage
   - Uptime, OS Version
   - WireGuard status
   - Last sync timestamp
```

### Managing Active Sessions
```
1. Dashboard → Active Sessions (or Sessions)
2. Shows real-time connected users:
   - Username
   - IP Address
   - MAC Address
   - Data Usage (in/out)
   - Connection time
3. Can disconnect users from this view
```

---

## Common Troubleshooting Commands

### If Agent Won't Connect

```bash
# 1. Check agent status
sudo systemctl status kiitec-connector

# 2. Review recent errors
sudo journalctl -u kiitec-connector -n 100 --no-pager

# 3. Test network path
ping 10.10.0.1
nc -zv 10.10.0.1 8728

# 4. Check config file
sudo cat /etc/kiitec-connector.env

# 5. Restart agent
sudo systemctl restart kiitec-connector

# 6. Wait 30-40 seconds, check logs again
sleep 40 && sudo journalctl -u kiitec-connector -n 20
```

### If WireGuard Tunnel is Down

```bash
# On MikroTik (SSH):
/interface/wireguard/peers/print detail

# Check if RX/TX bytes are non-zero (= active)
# If zero, the tunnel hasn't established

# On VPS, check WireGuard status:
sudo wg show

# If no WireGuard interface, may need to recreate on VPS side
```

### If Sessions Aren't Showing

```bash
# 1. Check hotspot is actually running on MikroTik
ssh admin@10.10.0.1
/ip/hotspot/active/print

# 2. Verify connector can read hotspot
sudo journalctl -u kiitec-connector -n 50 | grep -i hotspot

# 3. Test with manual hotspot user
/ip/hotspot/user/add name=test123 password=test123
# Then connect a test device

# 4. Check database
# In dashboard, check if sessions are being recorded
```

---

## Monitoring & Health Checks

### Regular Health Checks
```bash
# Daily check (run weekly)
sudo journalctl -u kiitec-connector --since "7 days ago" | grep -c "synced"

# Monitor CPU/Memory on VPS
watch -n 5 'top -bn1 | head -20'

# Check disk space
df -h /opt/kiitec-connector

# Verify service is still enabled
sudo systemctl is-enabled kiitec-connector

# Check for any restarts
sudo journalctl -u kiitec-connector | grep -i "start\|restart\|fail"
```

### Performance Metrics
```bash
# Count successful syncs (last 24 hours)
sudo journalctl -u kiitec-connector --since "24 hours ago" | grep "synced" | wc -l

# Find average response time from logs
sudo journalctl -u kiitec-connector --since "1 hour ago" | grep "synced"

# Check for errors
sudo journalctl -u kiitec-connector -p err -n 20
```

---

## File Locations Reference

| File | Location | Purpose |
|------|----------|---------|
| Agent Script | `/opt/kiitec-connector/agent.py` | Main connector agent |
| Dependencies | `/opt/kiitec-connector/requirements.txt` | Python packages |
| Venv | `/opt/kiitec-connector/venv/` | Python virtual environment |
| Config | `/etc/kiitec-connector.env` | Agent configuration |
| Service | `/etc/systemd/system/kiitec-connector.service` | Systemd service file |
| Logs | `journalctl -u kiitec-connector` | Service logs |

---

## Emergency Commands

### If Agent is Stuck or Broken
```bash
# Force stop
sudo systemctl stop kiitec-connector

# Kill any remaining processes
sudo killall -9 python3
# or
sudo pkill -9 -f "agent.py"

# Restart
sudo systemctl start kiitec-connector

# Check logs
sudo journalctl -u kiitec-connector -f
```

### If You Need to Rotate Token
```bash
# 1. Generate new token in dashboard
# 2. Update VPS config
sudo nano /etc/kiitec-connector.env
# Update KIITEC_CONNECTOR_TOKEN=kc_newtoken

# 3. Restart agent
sudo systemctl restart kiitec-connector

# 4. Verify reconnection
sudo journalctl -u kiitec-connector -f
```

### If Port 8728 is Already in Use
```bash
# Check what's using port 8728
sudo lsof -i :8728
sudo netstat -tulpn | grep 8728

# Check on MikroTik which port API is using
# (In Winbox: IP → Services)

# If needed, change API port to 8729 (with TLS)
# Then update agent config:
# MIKROTIK_PORT=8729
# MIKROTIK_USE_TLS=true
```

---

## Quick Reference: Configuration Values

```
Dashboard URL Pattern: https://<your-app>.lovable.app
API Endpoint: https://<your-app>.lovable.app/api/public/connector/sync

MikroTik:
- WireGuard Tunnel IP: 10.10.0.1/24
- API Port (plaintext): 8728
- API Port (TLS): 8729
- Default WireGuard Port: 51820

VPS:
- Agent Location: /opt/kiitec-connector/agent.py
- Config Location: /etc/kiitec-connector.env
- Service Name: kiitec-connector
- Default Sync Interval: 20 seconds
- Venv Python: /opt/kiitec-connector/venv/bin/python3

Credentials (Store Securely):
- Connector User: connector
- Connector Token: kc_xxxxxxxxxxxxxxxxxxxxxx (dashboard settings)
```
