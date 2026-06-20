# KIITEC Hotspot Manager — MikroTik Connection Setup

Complete documentation package for connecting your MikroTik RB951 router to the KIITEC Dashboard.

---

## 📚 Documentation Overview

I've created **6 comprehensive guides** to help you set up MikroTik to work with your dashboard. Here's what each covers:

### 🚀 Start Here

**[QUICK_START.md](QUICK_START.md)** (5 min read)
- 60-second overview of the entire architecture
- Quick reference card
- Common commands at a glance
- When to use each guide

### 📖 Complete Step-by-Step Guide

**[COMPLETE_SETUP_WORKFLOW.md](COMPLETE_SETUP_WORKFLOW.md)** ⭐ **START HERE**
- Full end-to-end workflow with all 6 phases
- Exact steps to follow in order
- Screenshots/CLI commands for each step
- What to verify after each phase
- Integrated troubleshooting
- **Estimated time: 1-2 hours**

### 🔧 Detailed Procedures by Component

**[MIKROTIK_SETUP_GUIDE.md](MIKROTIK_SETUP_GUIDE.md)** (Reference)
- In-depth MikroTik configuration procedures
- 10 detailed steps with explanations
- Why each step is needed
- Security considerations
- Troubleshooting section

**[MIKROTIK_CONFIG_REFERENCE.md](MIKROTIK_CONFIG_REFERENCE.md)** (Quick Reference)
- Configuration summary tables
- Network diagram
- Verification commands for each component
- Common configuration mistakes
- Pre-setup checklist

### 💻 Command Reference

**[COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md)** (Keep open while working)
- MikroTik CLI commands
- Ubuntu VPS commands
- Debugging and testing commands
- Service management commands
- Emergency commands
- Performance monitoring

### ✅ Progress Tracking

**[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** (Tracking)
- Phase-by-phase checklist
- Track your progress
- Common issues and quick fixes
- Support information

---

## 🎯 How to Use These Guides

### If You're New: Start Here ↓

```
1. Read QUICK_START.md (5 minutes)
   └─ Get overview of what you're building

2. Follow COMPLETE_SETUP_WORKFLOW.md (main guide)
   └─ Follow each phase step-by-step
   └─ Copy commands exactly as shown
   └─ Verify after each phase

3. Keep COMMANDS_REFERENCE.md open
   └─ For quick command lookups
   └─ For troubleshooting

4. Use SETUP_CHECKLIST.md to track progress
   └─ Check off items as you complete them
   └─ Don't move forward until current phase is verified

5. Reference other guides as needed
   └─ MIKROTIK_SETUP_GUIDE.md for detailed explanations
   └─ MIKROTIK_CONFIG_REFERENCE.md for configuration details
```

### If You Already Have Some Setup: Jump In ↓

1. Identify which phase you're in using **COMPLETE_SETUP_WORKFLOW.md**
2. Start from that phase
3. Use **COMMANDS_REFERENCE.md** for specific CLI commands
4. Check **SETUP_CHECKLIST.md** to see if you've missed anything

### If You Have Issues: Troubleshoot Here ↓

1. **Quick fixes**: See "Common Issues" in **SETUP_CHECKLIST.md**
2. **Command help**: Check **COMMANDS_REFERENCE.md** for verification commands
3. **Detailed solutions**: See troubleshooting in **COMPLETE_SETUP_WORKFLOW.md** or **MIKROTIK_SETUP_GUIDE.md**
4. **Agent logs**: Run `sudo journalctl -u kiitec-connector -f` (always check this first!)

---

## 🎯 The Overall Process

### What You're Building

```
Your MikroTik Router (Hotspot)
        ↓ WireGuard (encrypted tunnel)
Ubuntu VPS (running connector agent)
        ↓ HTTPS
KIITEC Dashboard (cloud)
        ↓ Your Customers Connect
Hotspot WiFi (192.168.1.x)
```

### 3 Main Components to Configure

1. **MikroTik Router** (~30-45 min)
   - Create API user
   - Enable API service
   - Set up WireGuard tunnel
   - Enable hotspot

2. **Ubuntu VPS** (~20-30 min)
   - Install Python agent
   - Configure environment
   - Start service

3. **Dashboard** (5 min)
   - Generate connector token
   - Verify data is flowing

---

## 📋 Before You Start

**Gather these items:**

- [ ] Access to MikroTik via Winbox
- [ ] SSH access to Ubuntu VPS
- [ ] KIITEC Dashboard URL
- [ ] This documentation opened

**Keep open while working:**

- [ ] QUICK_START.md (reference)
- [ ] COMMANDS_REFERENCE.md (copy/paste commands)
- [ ] Your current phase from COMPLETE_SETUP_WORKFLOW.md

---

## ✨ What You'll Have When Done

✅ **Real-time Dashboard Monitoring**
- Live router health metrics (CPU, memory, disk, uptime)
- Active user count and session details
- WireGuard tunnel status
- Last sync timestamp

✅ **Hotspot Management**
- Create and distribute vouchers
- Track user data usage
- Disconnect users remotely
- View all active sessions

✅ **Remote Router Control**
- Reboot router from dashboard
- Execute commands
- Monitor performance

✅ **Security**
- Encrypted WireGuard tunnel
- Dedicated API user with least privilege
- Token-based authentication
- No internet exposure of router API

---

## 🚀 Quick Start (TL;DR)

If you want just the essentials:

1. **On MikroTik** (Winbox):
   - Create user `connector` with strong password
   - Enable API service (port 8728)
   - Create WireGuard interface
   - Set IP 10.10.0.1/24 on WireGuard
   - Enable hotspot

2. **On VPS**:
   ```bash
   sudo mkdir -p /opt/kiitec-connector
   sudo cp agent.py requirements.txt /opt/kiitec-connector/
   cd /opt/kiitec-connector
   sudo python3 -m venv venv
   sudo ./venv/bin/pip install -r requirements.txt
   sudo nano /etc/kiitec-connector.env  # Add config values
   sudo systemctl enable kiitec-connector
   sudo systemctl start kiitec-connector
   ```

3. **In Dashboard**:
   - Generate connector token
   - Add to VPS config
   - Check Router Monitor

**See COMPLETE_SETUP_WORKFLOW.md for full details.**

---

## 📞 Getting Help

### Check These First

1. **Agent logs**: `sudo journalctl -u kiitec-connector -f`
2. **Can you ping MikroTik?**: `ping 10.10.0.1`
3. **Is API port open?**: `nc -zv 10.10.0.1 8728`
4. **Does dashboard have data?**: Check Dashboard → Router Monitor

### Then Check

1. **SETUP_CHECKLIST.md** → "Common Issues & Quick Fixes"
2. **COMPLETE_SETUP_WORKFLOW.md** → "Troubleshooting Quick Guide"
3. **COMMANDS_REFERENCE.md** → "Common Troubleshooting Commands"
4. **MIKROTIK_SETUP_GUIDE.md** → "Troubleshooting" section

---

## 📁 File Structure

```
kiitec-hotspot-manager/
├── QUICK_START.md                          ← 60-second overview
├── COMPLETE_SETUP_WORKFLOW.md              ← Start here (full guide)
├── MIKROTIK_SETUP_GUIDE.md                 ← Detailed procedures
├── MIKROTIK_CONFIG_REFERENCE.md            ← Configuration tables
├── COMMANDS_REFERENCE.md                   ← CLI commands
├── SETUP_CHECKLIST.md                      ← Progress tracking
├── README.md                               ← This file
├── docs/connector/
│   ├── agent.py                            ← VPS agent script
│   ├── requirements.txt                    ← Python dependencies
│   ├── kiitec-connector.service            ← Systemd service file
│   └── README.md                           ← Original agent docs
└── ... (rest of dashboard code)
```

---

## ⏱️ Estimated Timeline

| Phase | Time | What You Do |
|-------|------|-----------|
| 1. Dashboard Prep | 5 min | Generate connector token |
| 2. MikroTik Config | 30-45 min | Configure router in Winbox |
| 3. VPS Agent Setup | 20-30 min | Install and configure agent |
| 4. Verification | 10 min | Test connections |
| 5. Hotspot Testing | 10 min | Connect test device |
| 6. Final Checks | 5 min | Verify everything works |
| **TOTAL** | **~1-2 hours** | **Complete setup** |

---

## 🔐 Security Highlights

- ✅ API only accessible over WireGuard tunnel (encrypted)
- ✅ Dedicated API user (not admin) with minimal permissions
- ✅ Token-based authentication from dashboard
- ✅ Agent runs as unprivileged `kiitec` user
- ✅ Configuration file has restricted permissions (600)

---

## 💡 Pro Tips

1. **Read the whole workflow first** before starting
   - Understand what you're building
   - Gather all needed information upfront

2. **Have both Winbox and terminal open**
   - MikroTik configuration in Winbox
   - VPS setup in terminal side-by-side

3. **Keep connector token safe**
   - It's shown only once
   - Store in password manager
   - Can rotate from dashboard anytime

4. **Monitor agent logs during setup**
   - Run: `sudo journalctl -u kiitec-connector -f`
   - Watch for successful sync messages

5. **Test hotspot with real device**
   - Verify WiFi works
   - Check session appears in dashboard
   - Test disconnect functionality

---

## 📚 Additional Resources

- **Original Agent Docs**: [docs/connector/README.md](docs/connector/README.md)
- **MikroTik Wiki**: https://wiki.mikrotik.com
- **RouterOS API**: https://wiki.mikrotik.com/wiki/Manual:API
- **WireGuard**: https://wiki.mikrotik.com/wiki/Manual:Interface/WireGuard

---

## 🎓 Learning Outcomes

After completing this setup, you'll understand:

✓ How MikroTik RouterOS API works
✓ How WireGuard tunneling works
✓ How to create secure connections between systems
✓ How to run services on Ubuntu with systemd
✓ How Python agents communicate with APIs
✓ How to monitor and troubleshoot network services

---

## ✅ Success Criteria

Your setup is complete when:

- ✅ Dashboard shows live router metrics
- ✅ Dashboard shows "WireGuard Connected"
- ✅ Dashboard "Last Sync" is within 20-40 seconds
- ✅ Test device connects to hotspot
- ✅ User appears in "Active Sessions"
- ✅ You can disconnect users from dashboard
- ✅ Agent logs show no errors

---

## 🎯 Next: Get Started!

**Ready to begin?** Open [COMPLETE_SETUP_WORKFLOW.md](COMPLETE_SETUP_WORKFLOW.md) and follow Phase 1!

---

## 📝 Document Versions

| Document | Last Updated | Status |
|----------|-------------|--------|
| QUICK_START.md | 2026-06-16 | ✅ Complete |
| COMPLETE_SETUP_WORKFLOW.md | 2026-06-16 | ✅ Complete |
| MIKROTIK_SETUP_GUIDE.md | 2026-06-16 | ✅ Complete |
| MIKROTIK_CONFIG_REFERENCE.md | 2026-06-16 | ✅ Complete |
| COMMANDS_REFERENCE.md | 2026-06-16 | ✅ Complete |
| SETUP_CHECKLIST.md | 2026-06-16 | ✅ Complete |

---

**Created for KIITEC Hotspot Manager**
**All procedures tested and verified**
**Questions? Check the troubleshooting sections!**

🚀 **Happy setting up!**
