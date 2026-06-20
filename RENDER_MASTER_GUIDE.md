# Render.com Setup — Master Overview

**Complete guide for running your KIITEC connector agent on Render.com (FREE!)**

---

## 🎯 Why Render?

You said you don't have money for a VPS. Render is **completely free** and perfect for this:

```
✅ FREE forever (no trial, no time limit)
✅ 24/7 uptime (background worker)
✅ Auto-restarts if crash
✅ Simple deployment
✅ No credit card required
✅ Easy to update code
```

**Total setup time: 30-45 minutes**

---

## 📚 Documentation Structure

### Quick Start (5 min)
**[RENDER_QUICK_REFERENCE.md](RENDER_QUICK_REFERENCE.md)**
- Quick checklist
- File templates
- Environment variables
- Troubleshooting quick fixes

### Complete Guide (40 min)
**[RENDER_SETUP_GUIDE.md](RENDER_SETUP_GUIDE.md)** ⭐ **START HERE**
- Step-by-step walkthrough
- Screen-by-screen instructions
- All configuration files
- Verification steps
- Troubleshooting details

---

## 🚀 Quick Overview: 3 Steps

### Step 1: Create 4 Files (10 min)
On your computer, create:
- `agent.py` (copy from your project)
- `requirements.txt` (copy from your project)
- `.env` (configuration file)
- `render.yaml` (deployment config)

**See:** RENDER_QUICK_REFERENCE.md for file templates

### Step 2: Upload to GitHub (10 min)
- Create free GitHub account
- Create new repository: `kiitec-connector`
- Upload your 4 files
- Done!

### Step 3: Deploy on Render (10 min)
- Create free Render account
- Create new "Background Worker"
- Connect to GitHub repo
- Add environment variables
- Click Deploy

**Agent runs 24/7 on Render! ✅**

---

## 📋 What You Need

### From Your Project
```
kiitec-hotspot-manager/
└── docs/connector/
    ├── agent.py           ← Copy this
    └── requirements.txt   ← Copy this
```

### Create New Files
```
.env                ← Your configuration
render.yaml         ← Deployment config
```

### Accounts (All FREE)
```
GitHub              https://github.com
Render.com          https://render.com
```

---

## 🔑 Configuration Values You Need

Before starting, gather these:

1. **From your Dashboard (Settings)**
   - Dashboard URL: `https://<your-app>.lovable.app`
   - Connector Token: `kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **From your MikroTik (already set up)**
   - Connector user password: `<your-strong-password>`
   - WireGuard tunnel IP: `10.10.0.1`

3. **You'll Generate**
   - WireGuard key (Render generates this)

---

## 🎯 Choose Your Path

### Path A: Render (This Guide) ← **RECOMMENDED FOR YOU**
- Cost: FREE
- Setup time: 30-45 min
- Technical level: Beginner friendly
- Uptime: 24/7 (no timeout)
- Best for: First time, no budget

**👉 Follow RENDER_SETUP_GUIDE.md**

### Path B: Traditional VPS (Original Guide)
- Cost: $3-10/month
- Setup time: 45-60 min
- Technical level: Intermediate
- Uptime: 24/7 (manual management)
- Best for: More control, prefer traditional

**👉 See COMPLETE_SETUP_WORKFLOW.md (Phase 3)**

### Path C: Oracle Cloud Free Tier
- Cost: FREE forever
- Setup time: 45-60 min
- Technical level: Intermediate
- Uptime: 24/7 (full VPS)
- Best for: Want traditional VPS, no budget

---

## ⏱️ Expected Timeline

```
Total Time: ~45 minutes

Step 1: Create 4 files      10 min  (Gather from project + create 2 new)
Step 2: GitHub account      5 min   (Sign up)
Step 3: Upload to GitHub    10 min  (Drag & drop)
Step 4: Render account      5 min   (Sign up)
Step 5: Deploy to Render    10 min  (Connect & configure)
Step 6: MikroTik setup      5 min   (Add WireGuard peer)
```

---

## 📁 Folder Layout

You'll create on your computer:

```
C:\Users\<your-username>\Documents\kiitec-render\
│
├── agent.py              (COPY from project)
├── requirements.txt      (COPY from project)
├── .env                  (CREATE with config)
└── render.yaml           (CREATE from template)
```

Then upload all 4 files to GitHub repository `kiitec-connector`.

---

## 🔐 Security

With Render:
- ✅ Environment variables encrypted
- ✅ `.env` file not exposed publicly
- ✅ Private key stays on Render
- ✅ Only WireGuard tunnel to MikroTik
- ✅ No internet exposure of MikroTik API
- ✅ Token-based authentication

---

## ✅ How to Know It's Working

### Indicator 1: Render Dashboard
```
Status: Live ✅
```

### Indicator 2: Agent Logs
```
Every 20 seconds you see:
INFO  synced: 0 users, wg=true, 0 command(s)
```

### Indicator 3: Dashboard
```
Router Monitor shows:
- Live CPU/memory/disk data ✅
- WireGuard Connected ✅
- Last Sync: Within 20-40 seconds ✅
```

### Indicator 4: Hotspot Test
```
1. Device connects to hotspot
2. User appears in Active Sessions
3. Can disconnect from dashboard
```

**All 4 indicators = Success! ✅**

---

## 🛠️ 4 Files Explained

### File 1: `agent.py` (Unchanged)
- Your connector agent script
- Reads from MikroTik API
- Sends data to dashboard
- No changes needed
- **Action: Copy from project**

### File 2: `requirements.txt` (Unchanged)
- Python dependencies: `routeros_api`, `requests`
- Render uses this to install packages
- No changes needed
- **Action: Copy from project**

### File 3: `.env` (Create with Config)
```ini
# Your specific configuration
# Contains: URLs, tokens, passwords, IP addresses
# Keep this private and secure!
```
- **Action: Create from RENDER_QUICK_REFERENCE.md template**

### File 4: `render.yaml` (Create from Template)
```yaml
# Tells Render how to run your agent
# Specifies: Python environment, start command, variables
```
- **Action: Create from RENDER_QUICK_REFERENCE.md template**

---

## 🚀 Next: Follow the Complete Guide

Open **[RENDER_SETUP_GUIDE.md](RENDER_SETUP_GUIDE.md)** and follow:
- Step 1: Create Render account
- Step 2: Prepare code (4 files)
- Step 3: Upload to GitHub
- Step 4: Deploy to Render
- Step 5: Monitor deployment
- Step 6: Configure MikroTik WireGuard
- Step 7: Verify everything works

---

## 💡 Pro Tips

### Tip 1: Keep Files Organized
```
Keep the kiitec-render folder even after deploying
- Easy to make updates later
- Can redeploy if needed
- Good backup location
```

### Tip 2: Backup Your .env
```
Save your .env file securely
- Contains sensitive data (tokens, passwords)
- Need it if you redeploy
- Store in password manager or secure folder
```

### Tip 3: Update When Needed
```
To update agent code:
1. Push changes to GitHub
2. Render auto-deploys OR
3. Click Manual Deploy in Render dashboard
```

### Tip 4: Monitor Logs
```
Check logs occasionally:
- Render Dashboard → Logs
- Look for "synced" messages every 20s
- Watch for errors
```

---

## 🎓 What You'll Learn

By completing this setup, you'll understand:
- How Python agents work
- How GitHub deployment works
- How environment variables work
- How WireGuard tunneling works
- How to monitor running services
- Basic Linux concepts

---

## ❓ FAQ

### Q: Will this really be free forever?
**A:** Yes! Render's background worker is free forever (not a trial).

### Q: What if Render goes down?
**A:** Background workers auto-restart on crash. Render has 99%+ uptime.

### Q: Can I upgrade later?
**A:** Yes! Click "Upgrade to Paid" in Render for $7/month if needed.

### Q: What if I need to change the password?
**A:** Update environment variable in Render, service auto-restarts.

### Q: Can I run this on my home computer instead?
**A:** Yes, but Render is better (always on, doesn't use your electricity).

### Q: Will this work with my dashboard?
**A:** Yes, exactly same as VPS. Dashboard doesn't know it's on Render.

### Q: How fast is the connection?
**A:** Very fast. WireGuard tunnel is optimized and low-latency.

### Q: Can I use this with multiple routers?
**A:** Yes, deploy multiple agents (one per router) on Render.

---

## 📞 Getting Help

### If Something Goes Wrong

1. **Check Render logs first**
   - Render Dashboard → Logs tab
   - Look for error messages

2. **Check MikroTik status**
   - Winbox → Interfaces → WireGuard → Peers
   - Should show recent LAST-HANDSHAKE

3. **Check Dashboard status**
   - Should show "Last Sync" within 20-40 seconds
   - If old, tunnel might be down

4. **Check configuration**
   - Verify all environment variables in Render
   - Compare with `.env` file

5. **Refer to RENDER_SETUP_GUIDE.md**
   - Troubleshooting section has detailed solutions

---

## ✨ Summary

You're setting up:
- **Agent**: Runs on Render.com (free, 24/7)
- **Connection**: WireGuard tunnel to MikroTik (encrypted)
- **Dashboard**: Receives real-time data
- **Hotspot**: Fully operational and manageable

**Total cost: $0**
**Total time: ~45 minutes**
**Result: Professional hotspot system**

---

## 🎯 Start Now!

**Open RENDER_SETUP_GUIDE.md and follow Step 1**

Everything is explained in detail. You've got this! 🚀

---

## 📚 All Related Guides

| Guide | Purpose | When to Use |
|-------|---------|-----------|
| RENDER_SETUP_GUIDE.md | Complete step-by-step | First time setup (start here) |
| RENDER_QUICK_REFERENCE.md | Quick checklist | Quick reference during setup |
| COMPLETE_SETUP_WORKFLOW.md | Traditional VPS guide | If using traditional VPS |
| MIKROTIK_SETUP_GUIDE.md | Detailed MikroTik procedures | For MikroTik configuration details |
| COMMANDS_REFERENCE.md | Command reference | For specific commands |

---

**Let's build your hotspot! 🎉**

**Start with RENDER_SETUP_GUIDE.md**
**Follow step-by-step**
**You'll be done in ~45 minutes**

Good luck! 🚀
