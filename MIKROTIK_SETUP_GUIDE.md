# KIITEC Hotspot Manager — MikroTik Setup Guide

Complete step-by-step procedures to configure your MikroTik RB951 router to connect with the KIITEC dashboard.

---

## 📋 Prerequisites

Before starting, ensure you have:
- MikroTik RB951 with RouterOS installed (latest version recommended)
- Access to MikroTik via Winbox or SSH
- Dashboard already deployed (Lovable app)
- Ubuntu VPS ready for the connector agent
- WireGuard configured on both VPS and MikroTik (for secure tunnel)

---

## 🔧 Step 1: Create a Dedicated RouterOS API User

**Why?** The dashboard should NOT use the admin account. Create a least-privilege API user.

### Via Winbox:
1. Open **Winbox** and connect to your MikroTik
2. Go to **System → Users**
3. Click **+ Add** (or press Ctrl+N)
4. Fill in:
   - **Name**: `connector`
   - **Password**: Generate a strong password (e.g., 24+ characters)
   - **Group**: `api` (this grants API access automatically)
5. Click **OK**

### Verify Permissions:
6. Double-click the newly created `connector` user
7. Go to the **Permissions** tab
8. Ensure these are checked:
   - ☑ **api** - allows API access
   - ☑ **read** - read operations
   - ☑ **write** - modify router settings/sessions
   - ☑ **reboot** - reboot the router
   - ☑ **test** - test commands (optional but useful)
9. Click **OK**

---

## 🔐 Step 2: Enable and Configure the API Service

### Check API Port:

1. In Winbox, go to **IP → Services**
2. Look for `api` (port 8728) and `api-ssl` (port 8729)

### For Plaintext API (Recommended over WireGuard tunnel):
- **api** should be **Enabled** on port **8728**
- Since communication is over the WireGuard tunnel, plaintext is acceptable
- Click the `api` line and set:
  - **Port**: 8728
  - **Certificate**: none (or keep default)
  - Click **OK**

### For SSL API (Extra security, optional):
- If using SSL, ensure `api-ssl` is enabled on **8729**
- This requires a certificate (see advanced section)

### Firewall Rules:
Since the API will only be accessed over WireGuard, you typically don't need firewall rules. However, if needed:

3. Go to **IP → Firewall → Filter Rules**
4. Add a rule to accept port 8728 from your WireGuard tunnel:
   - **Chain**: input
   - **Protocol**: tcp
   - **Dst. Port**: 8728
   - **Action**: accept
5. Click **OK**

---

## 🌐 Step 3: Configure WireGuard Tunnel (Router Side)

This ensures the VPS connector agent can reach the MikroTik API securely.

### Create WireGuard Interface:

1. Go to **Interfaces → WireGuard**
2. Click **+ Add New** (or press Ctrl+N)
3. Set:
   - **Name**: `wg-connector` (or any name)
   - **Mtu**: 1420
   - **Listen Port**: 51820 (or any available port)
   - Click **OK** and note the **Public Key** (you'll need this)

### Create WireGuard Peer (VPS):

4. Go to **Interfaces → WireGuard → Peers**
5. Click **+ Add New**
6. Set:
   - **Interface**: `wg-connector` (the one you just created)
   - **Public Key**: (Paste the VPS's WireGuard public key — you'll get this from VPS setup)
   - **Allowed Address**: `10.10.1.0/24` (VPS tunnel subnet)
   - **Endpoint Address**: (Leave empty if VPS initiates the tunnel)
   - **Endpoint Port**: (Leave empty)
   - Click **OK**

### Assign IP to WireGuard Interface:

7. Go to **IP → Addresses**
8. Click **+ Add New**
9. Set:
   - **Address**: `10.10.0.1/24` (router side of tunnel)
   - **Interface**: `wg-connector`
   - Click **OK**

### Enable Masquerading (if needed for NAT):

10. Go to **IP → Firewall → NAT**
11. Click **+ Add New**
12. Set:
    - **Chain**: srcnat
    - **Out. Interface**: `wg-connector`
    - **Action**: masquerade
    - Click **OK**

---

## 📡 Step 4: Enable Hotspot (if not already configured)

### Create Hotspot Server:

1. Go to **IP → Hotspot → Hotspot Servers**
2. Click **+ Add New**
3. Set:
   - **Name**: `hotspot1`
   - **Interface**: `ether2` (or your LAN interface)
   - **Address Pool**: Create a new IP pool (e.g., `192.168.1.50-192.168.1.200`)
   - **Profile**: Use default or create custom
   - Click **OK**

### Create Hotspot User Profile (Optional):

4. Go to **IP → Hotspot → User Profiles**
5. Ensure a default profile exists with desired bandwidth limits
6. If needed, create profiles for different user tiers

### Create Hotspot Users (Manual or via Dashboard):

You can create users manually here, but the dashboard will manage this:

7. Go to **IP → Hotspot → Users**
8. Click **+ Add New** to add test users (optional)

---

## 🔑 Step 5: Generate Connector Token in Dashboard

### In the KIITEC Dashboard:

1. Log in to your dashboard
2. Go to **Settings** (usually in top-right menu)
3. Find **Connector Token** section
4. Click **Generate Token**
5. **Copy the token immediately** — it's shown only once and looks like: `kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. Save it securely (you'll use it in the next step)

---

## 🖥️ Step 6: Set Up the VPS Connector Agent

### On Your Ubuntu VPS:

#### Create System User:
```bash
sudo useradd -r -s /usr/sbin/nologin kiitec || true
sudo mkdir -p /opt/kiitec-connector
```

#### Install Agent Files:
```bash
# Copy from your repo:
sudo cp docs/connector/agent.py /opt/kiitec-connector/
sudo cp docs/connector/requirements.txt /opt/kiitec-connector/
sudo cp docs/connector/kiitec-connector.service /etc/systemd/system/
sudo chown -R kiitec:kiitec /opt/kiitec-connector
```

#### Create Virtual Environment:
```bash
cd /opt/kiitec-connector
sudo python3 -m venv venv
sudo ./venv/bin/pip install --upgrade pip
sudo ./venv/bin/pip install -r requirements.txt
```

#### Create Configuration File:
```bash
sudo nano /etc/kiitec-connector.env
```

Add the following (replace values with your actual settings):
```ini
# Dashboard endpoint and authentication
KIITEC_SYNC_URL=https://<your-app-domain>.lovable.app/api/public/connector/sync
KIITEC_CONNECTOR_TOKEN=kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# MikroTik API connection details
MIKROTIK_HOST=10.10.0.1
MIKROTIK_PORT=8728
MIKROTIK_USER=connector
MIKROTIK_PASSWORD=<strong-password-from-step-1>
MIKROTIK_USE_TLS=false

# Sync interval (20 seconds is recommended)
KIITEC_INTERVAL_SECONDS=20
```

#### Secure the Configuration:
```bash
sudo chmod 600 /etc/kiitec-connector.env
sudo chown root:root /etc/kiitec-connector.env
```

#### Enable and Start the Service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable kiitec-connector
sudo systemctl start kiitec-connector
```

#### Verify It's Running:
```bash
sudo systemctl status kiitec-connector
sudo journalctl -u kiitec-connector -f
```

You should see messages like:
```
INFO  KIITEC connector starting. Sync target: https://... every 20s
INFO  synced: 0 users, wg=true, 0 command(s)
```

If you see errors:
- **Connection refused**: Check that WireGuard tunnel is up and MikroTik API port is open
- **Invalid credentials**: Verify `connector` user password in MikroTik
- **Unauthorized token**: Ensure the token in `/etc/kiitec-connector.env` matches what was generated

---

## ✅ Step 7: Verify Connection in Dashboard

### Check Router Monitor:

1. In the dashboard, go to **Router Monitor** (or similar)
2. You should see:
   - ✅ **WireGuard Status**: Connected
   - ✅ **CPU/Memory/Disk**: Live data from router
   - ✅ **Hotspot Active Users**: Live count
   - ✅ **Last Sync**: Recent timestamp

### If Not Connecting:

**Troubleshoot:**

1. **Check agent logs**:
   ```bash
   sudo journalctl -u kiitec-connector -n 50
   ```

2. **Test MikroTik connectivity from VPS**:
   ```bash
   ping 10.10.0.1  # Should ping the router over WireGuard
   ```

3. **Check WireGuard status on router**:
   - Go **Interfaces → WireGuard** in Winbox
   - Look for **Rx/Tx bytes** — should be non-zero if tunnel is active

4. **Verify token in dashboard settings**:
   - The stored token hash should match what's in the agent config

5. **Check firewall rules**:
   - Ensure port 8728 isn't blocked on MikroTik firewall

---

## 🎯 Step 8: Test Hotspot Functionality

### Connect a Test User:

1. On a device connected to the hotspot WiFi:
   - Open a browser and navigate to any HTTP site
   - You should be redirected to a login page

2. Use a test voucher/credentials created via dashboard

3. In the dashboard **Active Sessions**, you should see:
   - Username
   - IP address
   - MAC address
   - Data usage (bytes in/out)

### Test Disconnect Command:

1. In the dashboard, find a connected session
2. Click **Disconnect**
3. The session should drop immediately on the router

### Test Reboot Command:

1. In the dashboard **Settings**, find **Reboot Router**
2. Click **Reboot** (only if safe!)
3. Router should reboot

---

## 🔄 Step 9: Configure Voucher System (If Using)

### On MikroTik (User Manager method — if supported):

1. Go to **IP → Hotspot → User Profiles**
2. Create profiles with different speeds/limits

3. Go to **IP → Hotspot → Users**
4. Create users or import bulk users

### Via Dashboard (Recommended):

1. In the dashboard **Vouchers** section:
   - Generate new vouchers
   - Each voucher is a username/password pair
   - Print or export for distribution

2. The connector agent doesn't manage users directly — it just reads active sessions
3. User creation happens on the router side (either manual or imported)

---

## 🛡️ Security Checklist

- [ ] **API user**: Created `connector` user (not admin)
- [ ] **Permissions**: Only necessary permissions granted (api, read, write, reboot, test)
- [ ] **WireGuard**: Tunnel is active and secured
- [ ] **API port**: 8728 only accessible over WireGuard (not internet-exposed)
- [ ] **Configuration file**: `/etc/kiitec-connector.env` has 600 permissions
- [ ] **Token**: Stored securely, rotated periodically in dashboard
- [ ] **Firewall rules**: Only necessary rules in place
- [ ] **SSL certificates**: Generated for HTTPS if using `api-ssl` (8729)

---

## 📝 Troubleshooting

### Agent Can't Connect to MikroTik

```bash
# Check network path to router
ping 10.10.0.1

# Test API port with netcat
nc -zv 10.10.0.1 8728

# View agent logs
sudo journalctl -u kiitec-connector -f
```

### Hotspot Sessions Not Appearing

1. Verify hotspot is enabled on router
2. Check that a user is actually connected:
   ```
   [admin@MikroTik] > /ip/hotspot/active/print
   ```
3. Review agent logs for `/ip/hotspot/active` errors

### Dashboard Not Receiving Updates

1. Check token in agent config matches dashboard token
2. Verify HTTPS endpoint is reachable from VPS:
   ```bash
   curl -H "X-Connector-Token: kc_xxx" https://<your-app>.lovable.app/api/public/connector/sync
   ```
3. Check dashboard database for `router_heartbeats` records

### WireGuard Tunnel Not Established

1. Verify both sides have matching public keys
2. Check endpoint addresses and ports
3. Ensure firewall isn't blocking WireGuard port
4. Review WireGuard interface status in Winbox

---

## 📚 Additional Resources

- **MikroTik Documentation**: https://wiki.mikrotik.com
- **RouterOS API**: https://wiki.mikrotik.com/wiki/Manual:API
- **WireGuard on MikroTik**: https://wiki.mikrotik.com/wiki/Manual:Interface/WireGuard
- **Hotspot Setup**: https://wiki.mikrotik.com/wiki/Manual:IP/Hotspot

---

## 🎉 You're All Set!

Once all steps are complete, your dashboard should:
- ✅ Display real-time router health metrics
- ✅ Show active hotspot users and sessions
- ✅ Control user disconnections
- ✅ Manage hotspot operations
- ✅ Generate and manage vouchers

**Next Steps:**
1. Deploy vouchers to your hotspot users
2. Configure bandwidth limits and user profiles as needed
3. Set up payment/billing if applicable
4. Monitor router performance via dashboard

---

**Questions or Issues?**
- Check the troubleshooting section
- Review agent logs: `sudo journalctl -u kiitec-connector -f`
- Verify all configuration values match
