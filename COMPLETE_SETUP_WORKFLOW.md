# KIITEC Dashboard Connection — Complete Implementation Workflow

**Start here**: This is your master guide for connecting the MikroTik router to your KIITEC dashboard. Follow each phase in order.

---

## 🎯 Overall Architecture

```
Your KIITEC Dashboard (Cloud)
        ↑ HTTPS
        ├─ /api/public/connector/sync (with token)
        │
Ubuntu VPS (running connector agent)
        ↑ WireGuard tunnel (encrypted)
        ├─ 10.10.1.x
        │
MikroTik RB951 Router
        ├─ WireGuard interface (10.10.0.1/24)
        ├─ Hotspot WiFi (192.168.1.x)
        ├─ API Service (port 8728)
        │
Connected Users (hotspot WiFi)
```

---

## 📅 Phase 1: Dashboard Preparation (5 minutes)

### 1.1 Generate Connector Token

1. **Log in** to your KIITEC Dashboard
2. Go to **Settings** (gear icon, usually top-right)
3. Find **Connector Token** section
4. Click **Generate Token**
5. **Copy the token immediately** — format looks like: `kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. **Save it** in a secure location (password manager, secure note, etc.)
   - This token is shown **only once**
   - If you lose it, generate a new one
   - Storing insecurely could compromise your system

**✅ Save these details:**
- Dashboard URL: `https://<your-app>.lovable.app`
- Connector Token: `kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🔧 Phase 2: MikroTik Configuration (30-45 minutes)

### 2.1 Create API User

**via Winbox (easiest):**

1. Open **Winbox.exe**
2. Enter your MikroTik IP address
3. Click **Connect**
4. Go to **System → Users**
5. Click **+ Add** (Ctrl+N)
6. Fill in:
   ```
   Name:     connector
   Password: <generate-strong-password-24+chars>
   Group:    api
   ```
7. Click **OK**
8. Double-click the user again
9. Go to **Permissions** tab
10. Ensure checked:
    - ☑ api
    - ☑ read
    - ☑ write
    - ☑ reboot
    - ☑ test
11. Click **OK**

**✅ Save these details:**
- API User: `connector`
- API Password: `<your-strong-password>`

### 2.2 Enable API Service

1. In Winbox, go to **IP → Services**
2. Look for **api** (port 8728)
3. Click on the **api** line
4. Set:
   - **Port**: 8728
   - **Certificate**: leave blank
   - **Disabled**: unchecked
5. Click **OK**

### 2.3 Configure WireGuard (Router Side)

**Create WireGuard Interface:**

1. Go to **Interfaces → WireGuard**
2. Click **+ Add New** (Ctrl+N)
3. Set:
   ```
   Name:         wg-connector
   MTU:          1420
   Listen Port:  51820
   ```
4. Click **OK**
5. **Copy the Public Key** shown (you'll need this for VPS setup)

**✅ Save these details:**
- WireGuard Public Key (Router): `<long-alphanumeric-string>`

### 2.4 Assign IP to WireGuard Interface

1. Go to **IP → Addresses**
2. Click **+ Add New**
3. Set:
   ```
   Address:   10.10.0.1/24
   Interface: wg-connector
   ```
4. Click **OK**

### 2.5 Create Hotspot Server

1. Go to **IP → Hotspot → Hotspot Servers**
2. Click **+ Add New**
3. First, create an IP pool:
   - In the same window, click the **Address Pool** dropdown → **Manage**
   - Click **+ Add New**
   - Set:
     ```
     Name:      hotspot-pool
     Addresses: 192.168.1.50-192.168.1.200
     ```
   - Click **OK**
4. Back to hotspot server, set:
   ```
   Name:          hotspot1
   Interface:     ether2 (or ether3 - your LAN interface)
   Address Pool:  hotspot-pool
   Profile:       default
   ```
5. Click **OK**

### 2.6 Optional: Add Firewall Rule

1. Go to **IP → Firewall → Filter Rules**
2. Click **+ Add New**
3. Set:
   ```
   Chain:         input
   Protocol:      tcp
   Dst. Port:     8728
   In. Interface: wg-connector
   Action:        accept
   ```
4. Click **OK**

**✅ MikroTik Configuration Complete!**

---

## 🖥️ Phase 3: VPS Connector Agent Setup (20-30 minutes)

### 3.1 SSH into Your VPS

```bash
ssh user@<your-vps-ip>
sudo -i  # become root
```

### 3.2 Set Up WireGuard on VPS

Before running the agent, you need WireGuard tunnel established.

**If WireGuard is not yet set up on your VPS:**

```bash
# Install WireGuard
sudo apt update
sudo apt install wireguard wireguard-tools -y

# Generate VPS keys
cd /etc/wireguard
sudo wg genkey | sudo tee privatekey | sudo wg pubkey > publickey

# Save the VPS public key
sudo cat publickey
```

**✅ Copy the VPS public key** — you'll add it to MikroTik in the next step.

### 3.3 Add VPS Peer to MikroTik WireGuard

**Back in Winbox (MikroTik):**

1. Go to **Interfaces → WireGuard → Peers**
2. Click **+ Add New**
3. Set:
   ```
   Interface:      wg-connector
   Public Key:     <paste-vps-public-key-from-step-3.2>
   Allowed Address: 10.10.1.0/24
   ```
4. Click **OK**

### 3.4 Create Kiitec User & Directory

```bash
sudo useradd -r -s /usr/sbin/nologin kiitec || true
sudo mkdir -p /opt/kiitec-connector
```

### 3.5 Copy Agent Files

Copy the agent files from your repository to the VPS:

```bash
# If files are in a repository on the VPS:
cd /path/to/kiitec-hotspot-manager
sudo cp docs/connector/agent.py /opt/kiitec-connector/
sudo cp docs/connector/requirements.txt /opt/kiitec-connector/
sudo cp docs/connector/kiitec-connector.service /etc/systemd/system/

# Set ownership
sudo chown -R kiitec:kiitec /opt/kiitec-connector
```

### 3.6 Set Up Python Virtual Environment

```bash
cd /opt/kiitec-connector
sudo python3 -m venv venv
sudo ./venv/bin/pip install --upgrade pip
sudo ./venv/bin/pip install -r requirements.txt
```

Verify installation:
```bash
sudo ./venv/bin/python3 -c "import routeros_api; print('✓ OK')"
```

### 3.7 Create Configuration File

```bash
sudo nano /etc/kiitec-connector.env
```

Paste (replace `<values>` with your actual values):

```ini
# Dashboard connection
KIITEC_SYNC_URL=https://<your-app-domain>.lovable.app/api/public/connector/sync
KIITEC_CONNECTOR_TOKEN=kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# MikroTik API connection
MIKROTIK_HOST=10.10.0.1
MIKROTIK_PORT=8728
MIKROTIK_USER=connector
MIKROTIK_PASSWORD=<your-connector-password>
MIKROTIK_USE_TLS=false

# Sync interval
KIITEC_INTERVAL_SECONDS=20
```

**Reference your saved details from Phases 1-2:**
- `KIITEC_SYNC_URL` → From Phase 1.1 (Dashboard URL)
- `KIITEC_CONNECTOR_TOKEN` → From Phase 1.1 (Connector Token)
- `MIKROTIK_PASSWORD` → From Phase 2.1 (API User Password)

**Save file:** Press `Ctrl+O`, `Enter`, `Ctrl+X`

### 3.8 Secure Configuration

```bash
sudo chmod 600 /etc/kiitec-connector.env
sudo chown root:root /etc/kiitec-connector.env
```

### 3.9 Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable kiitec-connector
sudo systemctl start kiitec-connector
```

### 3.10 Verify Agent is Running

```bash
sudo systemctl status kiitec-connector
```

Should show: **active (running)**

```bash
sudo journalctl -u kiitec-connector -f
```

You should see within 20-40 seconds:
```
INFO  KIITEC connector starting. Sync target: https://... every 20s
INFO  synced: 0 users, wg=true, 0 command(s)
```

**✅ VPS Agent Setup Complete!**

---

## 🔍 Phase 4: Connection Verification (10 minutes)

### 4.1 Verify WireGuard Tunnel

**On VPS:**
```bash
ping 10.10.0.1
# Should get replies from MikroTik
```

**On MikroTik (Winbox):**
1. Go to **Interfaces → WireGuard → Peers**
2. Look for **Last Handshake** column
3. Should show recent time like `3s`, `15s`, etc. (not `0s` or very old)
4. **Rx/Tx bytes** should be non-zero

### 4.2 Verify API Connection

**On VPS:**
```bash
nc -zv 10.10.0.1 8728
# Should output: Connection to 10.10.0.1 8728 port [tcp/*] succeeded!
```

### 4.3 Check Dashboard for Live Data

1. Log into your **KIITEC Dashboard**
2. Go to **Router Monitor** (or main dashboard page)
3. You should see:
   - ✅ **CPU Load**: Live value
   - ✅ **Memory**: Live value
   - ✅ **Disk**: Live value
   - ✅ **Uptime**: Live value
   - ✅ **WireGuard Connected**: Yes/True
   - ✅ **Last Sync**: Recent timestamp (within last 20-40 seconds)

### 4.4 Verify Agent Logs

```bash
sudo journalctl -u kiitec-connector -n 30
```

Should show successful sync messages without errors.

**✅ Connection Verified!**

---

## 🧪 Phase 5: Hotspot Testing (10 minutes)

### 5.1 Connect a Test Device

1. On a smartphone, laptop, or tablet:
   - Find the hotspot WiFi SSID (from MikroTik config)
   - Connect to it
   - Wait a few seconds for DHCP

2. Open a browser
   - You should be redirected to a **Login Page**
   - (If not, try accessing any HTTP site like `http://google.com`)

### 5.2 Create a Test User (if needed)

**Option A: Create in Winbox**
1. Go to **IP → Hotspot → Users**
2. Click **+ Add New**
3. Set:
   ```
   Name:     testuser
   Password: test123
   ```
4. Click **OK**

**Option B: Create via Dashboard**
1. In dashboard, go to **Vouchers** (or Users)
2. Generate a new voucher
3. Use the username/password to login

### 5.3 Test Login

1. On the connected test device, enter credentials
2. Should be allowed internet access
3. Check the dashboard **Active Sessions**
   - You should see the test user listed
   - IP address, MAC address, data usage should show

### 5.4 Test Disconnect Command

1. In dashboard **Active Sessions**, find the test user
2. Click **Disconnect** (or similar button)
3. The device should lose internet access immediately
4. Session should disappear from **Active Sessions**

**✅ Hotspot Testing Complete!**

---

## 🎯 Phase 6: Final Checklist

**Before declaring setup complete, verify:**

- [ ] Dashboard shows router health metrics (CPU, memory, disk, uptime)
- [ ] Dashboard shows WireGuard as "Connected"
- [ ] Dashboard "Last Sync" timestamp is recent (within 20-40 seconds)
- [ ] Test hotspot user connects successfully
- [ ] Test user appears in "Active Sessions"
- [ ] Can disconnect user from dashboard
- [ ] Agent logs show no errors (check: `sudo journalctl -u kiitec-connector`)
- [ ] Service is enabled and auto-starts (check: `sudo systemctl is-enabled kiitec-connector`)
- [ ] WireGuard tunnel is stable (check: `ping 10.10.0.1` on VPS)

**If all boxes are checked:** ✅ **Setup is complete!**

---

## 📊 What's Now Working

Once complete, you have:

1. **Real-time Dashboard Monitoring**
   - Router health: CPU, memory, disk, uptime
   - Active users and sessions
   - Data usage tracking
   - WireGuard tunnel status

2. **Hotspot Management**
   - Create and issue vouchers
   - Track active users
   - Remotely disconnect users
   - Monitor per-user data consumption

3. **Remote Router Control**
   - Reboot router from dashboard
   - Execute commands on router
   - View and manage users

4. **Security**
   - Encrypted WireGuard tunnel
   - Connector token authentication
   - Least-privilege API user
   - No internet exposure of router API

---

## 🛠️ Troubleshooting Quick Guide

| Problem | First Check | Solution |
|---------|------------|----------|
| Agent won't start | `sudo systemctl status kiitec-connector` | Check logs: `journalctl -u kiitec-connector` |
| Can't ping MikroTik (10.10.0.1) | WireGuard tunnel | Check tunnel on both sides, verify peer config |
| Dashboard shows no data | Check token | Verify token in `/etc/kiitec-connector.env` matches dashboard |
| Sessions not appearing | Hotspot enabled? | Verify hotspot in MikroTik → Check `/ip/hotspot/active/print` |
| Can't login to hotspot | User exists? | Create user in MikroTik or dashboard first |
| Last sync is old | Agent running? | `sudo systemctl restart kiitec-connector` |

**For detailed troubleshooting:**
- See `COMMANDS_REFERENCE.md`
- See `MIKROTIK_SETUP_GUIDE.md` → Troubleshooting section

---

## 📋 Saved Configuration Reference

**Keep these values saved for future reference:**

```
Dashboard URL:                 https://<your-app>.lovable.app
Connector Token:               kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

MikroTik:
  API User:                    connector
  API Password:                <your-strong-password>
  API Host:                    10.10.0.1
  API Port:                    8728
  WireGuard Tunnel IP:         10.10.0.1/24
  WireGuard Peer Port:         51820
  WireGuard Public Key:        <key>
  Hotspot Interface:           ether2 (or ether3)
  Hotspot IP Pool:             192.168.1.50-192.168.1.200

VPS:
  Connector Agent Location:    /opt/kiitec-connector/agent.py
  Config Location:             /etc/kiitec-connector.env
  Service Name:                kiitec-connector
  WireGuard Public Key:        <key>
```

---

## 📞 Next Steps

1. **For production deployment:**
   - Set up proper user profiles with bandwidth limits
   - Configure payment/pricing
   - Set up backup for voucher codes
   - Monitor agent logs regularly

2. **For troubleshooting:**
   - Reference `COMMANDS_REFERENCE.md`
   - Check `MIKROTIK_CONFIG_REFERENCE.md`
   - Review agent logs: `sudo journalctl -u kiitec-connector -f`

3. **For security:**
   - Rotate connector token periodically from dashboard
   - Update router API password occasionally
   - Monitor WireGuard tunnel health
   - Keep RouterOS updated

---

## 🎉 Congratulations!

Your KIITEC Hotspot Manager is now connected to your MikroTik router!

**Questions or issues?**
- Check the troubleshooting sections in referenced docs
- Review your configuration against the setup guides
- Check agent logs for error messages

---

**Configuration Date**: _______________
**Last Verified**: _______________
**Notes**: _______________________________________________________

---

*Generated for KIITEC Hotspot Manager*
*Last Updated: 2026-06-16*
