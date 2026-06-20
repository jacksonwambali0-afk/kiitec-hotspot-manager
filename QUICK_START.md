# KIITEC Setup — Quick Start Card

**Print or keep nearby for easy reference during setup**

---

## 🚀 60-Second Overview

```
MikroTik Router ──WireGuard──→ Ubuntu VPS ──HTTPS──→ Dashboard
   (Hotspot)      (Encrypted)   (Agent)      (Data)   (Cloud)
   10.10.0.1                   10.10.1.x            https://app
```

---

## 📋 What You Need

- [ ] MikroTik RB951 (or similar)
- [ ] Ubuntu VPS with internet access
- [ ] Dashboard already deployed
- [ ] This guide handy!

---

## 🎯 3 Main Steps

### Step 1: MikroTik Setup (30 min)
```
1. Create API user "connector" (System → Users)
2. Enable API service on port 8728 (IP → Services)
3. Create WireGuard interface (Interfaces → WireGuard)
4. Assign IP 10.10.0.1/24 to WireGuard
5. Enable hotspot (IP → Hotspot)
6. Add VPS as WireGuard peer (with VPS public key)
```

### Step 2: VPS Agent Setup (20 min)
```bash
# Create directory
sudo mkdir -p /opt/kiitec-connector

# Install agent
sudo cp agent.py requirements.txt /opt/kiitec-connector/

# Install dependencies
cd /opt/kiitec-connector
sudo python3 -m venv venv
sudo ./venv/bin/pip install -r requirements.txt

# Create config
sudo nano /etc/kiitec-connector.env
# Add: MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD, TOKEN

# Start service
sudo systemctl enable kiitec-connector
sudo systemctl start kiitec-connector
```

### Step 3: Dashboard Verification (5 min)
```
1. Go to Dashboard Settings → Generate Connector Token
2. Copy token to VPS config
3. Check Dashboard → Router Monitor
4. Verify: Router data live, WireGuard connected, Last sync recent
```

---

## 📝 Configuration Values

| Setting | Value | Source |
|---------|-------|--------|
| Dashboard URL | https://your-app.lovable.app | Dashboard |
| Connector Token | kc_xxxx... | Dashboard → Settings |
| API User | connector | Create in MikroTik |
| API Password | <strong-pass> | Create in MikroTik |
| API Host | 10.10.0.1 | MikroTik WireGuard IP |
| API Port | 8728 | MikroTik default |
| Sync Interval | 20 | Agent default |

---

## ✅ Verification Commands

```bash
# VPS: Check if agent is running
sudo systemctl status kiitec-connector

# VPS: View recent logs
sudo journalctl -u kiitec-connector -n 20

# VPS: Test MikroTik connection
ping 10.10.0.1
nc -zv 10.10.0.1 8728

# MikroTik: Check WireGuard tunnel (in CLI)
/interface/wireguard/peers/print
# Look for: last-handshake (should show recent, like "3s")
```

---

## 🔍 Dashboard Check

After setup, you should see in Dashboard:
- ✅ Router health metrics (CPU, memory, disk, uptime)
- ✅ WireGuard status: Connected
- ✅ Last sync: Recent (within 20-40 seconds)
- ✅ Active sessions: Your test users

---

## 🆘 If It Doesn't Work

1. **Check agent logs first:**
   ```bash
   sudo journalctl -u kiitec-connector -f
   ```

2. **Verify tunnel is up:**
   ```bash
   ping 10.10.0.1
   ```

3. **Verify credentials:**
   ```bash
   cat /etc/kiitec-connector.env | grep MIKROTIK
   ```

4. **Restart agent:**
   ```bash
   sudo systemctl restart kiitec-connector
   ```

5. **If still stuck:** See `COMPLETE_SETUP_WORKFLOW.md` → Troubleshooting

---

## 📁 Full Documentation

**Start with these files in order:**

1. **`COMPLETE_SETUP_WORKFLOW.md`** ← Start here (complete step-by-step)
2. **`MIKROTIK_SETUP_GUIDE.md`** ← Detailed MikroTik procedures
3. **`MIKROTIK_CONFIG_REFERENCE.md`** ← Configuration summary
4. **`COMMANDS_REFERENCE.md`** ← Command reference
5. **`SETUP_CHECKLIST.md`** ← Track your progress

---

## 🔐 Security Notes

- API port 8728 is only accessible over WireGuard tunnel (encrypted)
- Use strong password for "connector" user (24+ characters)
- Rotate connector token occasionally in Dashboard
- Only grant necessary permissions to API user

---

## ⏱️ Typical Timeline

- **MikroTik setup**: 30-45 minutes
- **VPS setup**: 20-30 minutes
- **Testing**: 10-15 minutes
- **Total**: ~1-2 hours

---

## 💡 Pro Tips

1. **Keep WireGuard tunnel stable**
   - Check tunnel health regularly
   - Monitor last-handshake times

2. **Monitor agent logs**
   - Run: `journalctl -u kiitec-connector -f`
   - Look for "synced" messages every 20 seconds

3. **Test hotspot often**
   - Create test users to verify connection
   - Monitor active sessions from dashboard

4. **Save all credentials securely**
   - Connector token (from dashboard)
   - API password (MikroTik)
   - Backup `/etc/kiitec-connector.env`

---

## 📞 File Quick Reference

```
Dashboard Setup:
→ Settings → Generate Connector Token

MikroTik Setup:
→ System → Users (create "connector")
→ IP → Services (enable api on 8728)
→ Interfaces → WireGuard (create wg-connector)
→ IP → Addresses (assign 10.10.0.1/24)
→ IP → Hotspot (enable hotspot server)

VPS Setup:
→ /opt/kiitec-connector/agent.py (agent script)
→ /etc/kiitec-connector.env (configuration)
→ /etc/systemd/system/kiitec-connector.service (service file)

View Logs:
→ journalctl -u kiitec-connector -f
```

---

## ✨ When You're Done

You'll have:
- ✅ Real-time router monitoring in dashboard
- ✅ Live hotspot user tracking
- ✅ Remote user disconnect capability
- ✅ Router reboot capability
- ✅ Encrypted tunnel connection
- ✅ Secure API with dedicated user

---

## 🎓 Learning Path

1. Read `COMPLETE_SETUP_WORKFLOW.md` once fully
2. Follow it step-by-step
3. Keep `COMMANDS_REFERENCE.md` open while working
4. Use `SETUP_CHECKLIST.md` to track progress
5. Reference `MIKROTIK_CONFIG_REFERENCE.md` for details

---

**Happy setting up! 🚀**

For questions: Check the detailed guides or review the troubleshooting sections.
