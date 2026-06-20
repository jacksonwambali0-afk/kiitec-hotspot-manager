# KIITEC Setup — MikroTik Configuration Summary

Complete configuration reference for MikroTik RB951 setup. Keep this open in Winbox while configuring.

---

## 📋 Configuration Checklist

### 1. API User Creation
**Location**: System → Users

| Field | Value |
|-------|-------|
| Name | `connector` |
| Password | `<generate strong password>` |
| Group | `api` |

**Permissions Tab** - Ensure Checked:
- ✅ api
- ✅ read
- ✅ write
- ✅ reboot
- ✅ test

---

### 2. API Service Configuration
**Location**: IP → Services

| Service | Enabled | Port |
|---------|---------|------|
| api | ✅ Yes | 8728 |
| api-ssl | ❌ No (unless TLS required) | 8729 |

> **Note**: Only enable `api-ssl` if using TLS certificates

---

### 3. WireGuard Interface
**Location**: Interfaces → WireGuard

| Field | Value |
|-------|-------|
| Name | `wg-connector` |
| MTU | 1420 |
| Listen Port | 51820 |
| Private Key | *(generated automatically)* |
| Public Key | *(generated automatically - save this)* |

**Copy the Public Key** — you'll need this when configuring the VPS.

---

### 4. WireGuard Peer (VPS Connection)
**Location**: Interfaces → WireGuard → Peers

| Field | Value |
|-------|-------|
| Interface | `wg-connector` |
| Public Key | `<paste VPS public key here>` |
| Allowed Address | `10.10.1.0/24` |
| Endpoint Address | *(leave empty)* |
| Endpoint Port | *(leave empty)* |
| Preshared Key | *(optional, leave empty if not needed)* |

> **Note**: Save the VPS public key from WireGuard setup on the VPS side

---

### 5. IP Address Assignment
**Location**: IP → Addresses

| Field | Value |
|-------|-------|
| Address | `10.10.0.1/24` |
| Interface | `wg-connector` |
| Comment | `Connector Tunnel` |

> This is the router's IP on the WireGuard tunnel. VPS will be `10.10.1.x`

---

### 6. Firewall Rule (Optional but Recommended)
**Location**: IP → Firewall → Filter Rules

Add this rule to allow API traffic:

| Field | Value |
|-------|-------|
| Chain | `input` |
| Protocol | `tcp` |
| Dst. Port | `8728` |
| In. Interface | `wg-connector` |
| Action | `accept` |
| Place Before | `0` (at top) |

---

### 7. NAT/Masquerade (If Needed)
**Location**: IP → Firewall → NAT

| Field | Value |
|-------|-------|
| Chain | `srcnat` |
| Out. Interface | `wg-connector` |
| Action | `masquerade` |

> Only needed if VPS needs to access devices beyond the router

---

### 8. Hotspot Configuration
**Location**: IP → Hotspot → Hotspot Servers

| Field | Value |
|-------|-------|
| Name | `hotspot1` |
| Interface | `ether2` (or your LAN interface) |
| Address Pool | Create: `192.168.1.50-192.168.1.200` |
| Profile | `default` or custom |

**Create IP Pool First:**
1. Go to IP → Pools
2. Add new pool:
   - Name: `hotspot-pool`
   - Addresses: `192.168.1.50-192.168.1.200`

---

### 9. Hotspot User Profile (Optional Custom)
**Location**: IP → Hotspot → User Profiles

| Profile Type | Bandwidth Settings |
|--------------|-------------------|
| Free (1hr) | No limit or low limit |
| Basic ($2) | 5Mbps down, 1Mbps up |
| Pro ($5) | 20Mbps down, 5Mbps up |
| Business ($10) | Unlimited |

> Configure based on your pricing model. Dashboard will manage actual users.

---

### 10. Default Hotspot User (Optional Test)
**Location**: IP → Hotspot → Users

| Field | Value |
|-------|-------|
| Name | `test123` |
| Password | `test123` |
| Profile | `default` |
| Comment | `Test User` |

> Create one test user to verify hotspot works before full deployment

---

## 🔗 Network Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   INTERNET                                   │
└────────────┬────────────────────────────────────────────────┘
             │
             │
        ┌────────────┐
        │  VPS       │
        │ 1.2.3.4    │  ← Your VPS public IP
        └────┬───────┘
             │ WireGuard tunnel (encrypted)
             │ Port 51820
             │
        ┌────▼───────────────────────────────┐
        │  MIKROTIK RB951                     │
        │  ┌─────────────────────────────┐   │
        │  │ WireGuard Interface         │   │
        │  │ wg-connector                │   │
        │  │ IP: 10.10.0.1/24            │   │
        │  │ Port: 51820                 │   │
        │  │ Peer: VPS (10.10.1.0/24)    │   │
        │  └─────────────────────────────┘   │
        │  ┌─────────────────────────────┐   │
        │  │ API Service                 │   │
        │  │ Port: 8728 (plaintext)      │   │
        │  │ User: connector             │   │
        │  └─────────────────────────────┘   │
        │  ┌─────────────────────────────┐   │
        │  │ Hotspot                     │   │
        │  │ Interface: ether2           │   │
        │  │ IPs: 192.168.1.50-200       │   │
        │  └─────────────────────────────┘   │
        └────────────────────────────────────┘
             │
             │ WiFi (2.4GHz/5GHz)
             │
        ┌────▼──────────┐
        │ Client Device │
        │ 192.168.1.x   │
        └───────────────┘
```

---

## 🔐 Security Configuration Summary

| Component | Configuration | Security Notes |
|-----------|---------------|-----------------|
| **API User** | `connector` (not admin) | Least privilege principle |
| **User Permissions** | api, read, write, reboot, test | Only necessary permissions |
| **API Port** | 8728 (plaintext over WireGuard) | Secure because it's in tunnel |
| **WireGuard** | Encrypted tunnel 10.10.0.1/24 | Pre-shared encryption |
| **Firewall** | Allow API from WireGuard only | No internet exposure |
| **Service** | Runs as `kiitec` (not root) | Limited privilege daemon |

---

## 📊 System Resource Requirements

| Resource | Requirement | Notes |
|----------|-------------|-------|
| **Memory** | 256 MB+ | MikroTik API uses minimal memory |
| **CPU** | Minimal load | API calls are periodic (20s intervals) |
| **Disk** | 100 MB+ free | Store logs and temporary data |
| **Network** | Stable tunnel | WireGuard must stay connected |

---

## 🧪 Verification Steps (After Configuration)

### Step 1: Check API User
```
[admin@MikroTik] > /user/print
Columns: NAME, GROUP, ADDRESS, LAST-ADDRESS
#       NAME        GROUP
0       admin       admin
1       connector   api        <- Verify this exists
```

### Step 2: Check API Service
```
[admin@MikroTik] > /ip/service/print
Columns: NAME, PORT, DISABLED
#       NAME        PORT      DISABLED
0       telnet      23        false
1       ftp         21        false
2       www         80        false
3       api         8728      false    <- Must show false
4       api-ssl     8729      false
```

### Step 3: Check WireGuard Interface
```
[admin@MikroTik] > /interface/wireguard/print
Columns: NAME, MTU, RUNNING
#       NAME          MTU    RUNNING
0       wg-connector  1420   true     <- Must show true
```

### Step 4: Check WireGuard Peers
```
[admin@MikroTik] > /interface/wireguard/peers/print
Columns: INTERFACE, PUBLIC-KEY, ALLOWED-ADDRESS, ENDPOINT-ADDRESS, ENDPOINT-PORT, LAST-HANDSHAKE
#       INTERFACE      PUBLIC-KEY                   ALLOWED-ADDRESS  ENDPOINT-ADDRESS  LAST-HANDSHAKE
0       wg-connector   <VPS-key>                    10.10.1.0/24     [none]            3s
```
> **LAST-HANDSHAKE** should show recent time (e.g., "3s") if tunnel is active

### Step 5: Check WireGuard IP
```
[admin@MikroTik] > /ip/address/print where interface=wg-connector
Columns: ADDRESS, INTERFACE
#       ADDRESS          INTERFACE
0       10.10.0.1/24     wg-connector   <- Verify this is set
```

### Step 6: Test Hotspot
```
[admin@MikroTik] > /ip/hotspot/print
#       NAME       INTERFACE  PROFILE  ADDRESS-POOL
0       hotspot1   ether2     default  hotspot-pool  <- Verify enabled

[admin@MikroTik] > /ip/hotspot/active/print
# (Should show connected users, if any)
```

---

## 🛠️ Common Configuration Mistakes

| Mistake | Impact | Fix |
|--------|--------|-----|
| API port 8728 is disabled | Agent can't connect | Enable it in IP → Services |
| WireGuard peer address is wrong | Tunnel can't form | Verify public key and allowed address |
| Firewall blocks port 8728 | API access denied | Add firewall rule or disable firewall |
| Connector user doesn't have API group | Authentication fails | Re-assign user to `api` group |
| Hotspot interface is wrong | Users can't connect | Verify interface name (usually ether2 or ether3) |
| IP pool for hotspot not created | DHCP fails | Create pool before enabling hotspot |

---

## 📝 Pre-VPS Setup Checklist

Before configuring the VPS agent, verify these on MikroTik:

- [ ] `connector` user exists with strong password
- [ ] `connector` has `api` group
- [ ] API service (port 8728) is enabled
- [ ] WireGuard interface `wg-connector` is created and running
- [ ] WireGuard interface has IP `10.10.0.1/24`
- [ ] WireGuard peer added (with VPS public key once available)
- [ ] Hotspot is configured and enabled
- [ ] Test user created (optional)
- [ ] All firewall rules in place

---

## 🔄 Integration Flow

```
1. VPS Agent starts
   ↓
2. Agent loads config from /etc/kiitec-connector.env
   ↓
3. Agent connects to MikroTik API (10.10.0.1:8728)
   ↓
4. Agent authenticates using `connector` credentials
   ↓
5. Agent reads:
   - Router health (/system/resource)
   - Router name (/system/identity)
   - Active sessions (/ip/hotspot/active)
   - WireGuard status (/interface/wireguard/peers)
   ↓
6. Agent POSTs data to Dashboard with token
   ↓
7. Dashboard receives data and updates display
   ↓
8. Dashboard queues any commands
   ↓
9. Agent retrieves commands and executes on MikroTik
   ↓
10. Agent reports results back to Dashboard
    ↓
11. Wait 20 seconds, repeat from step 5
```

---

## 🎯 Final Verification

**When everything is configured correctly, you should see:**

✅ Agent connects successfully to MikroTik API
✅ Router health data appears in dashboard
✅ Connected users show in "Active Sessions"
✅ WireGuard status shows "Connected"
✅ Last sync timestamp is recent (within 20-40 seconds)
✅ Dashboard can disconnect users
✅ Dashboard can reboot router

---

## 📞 Support Reference

**If you need to troubleshoot:**

1. **Verify WireGuard tunnel is up**:
   ```
   /interface/wireguard/peers/print detail
   ```
   Check LAST-HANDSHAKE is recent (not "0s" or old)

2. **Test API connectivity from VPS**:
   ```bash
   nc -zv 10.10.0.1 8728
   ```

3. **Check agent logs for errors**:
   ```bash
   sudo journalctl -u kiitec-connector -f
   ```

4. **Verify connector user credentials**:
   ```
   /user/print detail
   ```
   Look for "connector" user with all permissions

5. **Check active sessions**:
   ```
   /ip/hotspot/active/print
   ```

---

## 📚 Related Documentation Files

- `MIKROTIK_SETUP_GUIDE.md` — Detailed step-by-step guide
- `SETUP_CHECKLIST.md` — Progress tracking checklist
- `COMMANDS_REFERENCE.md` — Quick command reference
- `docs/connector/README.md` — Agent documentation

---

**Generated for KIITEC Hotspot Manager**
**Last Updated**: 2026-06-16
