# Render.com Setup — Quick Reference Card

**Print or keep nearby during setup**

---

## 🎯 3 Main Steps

### Step 1: Create Files (10 min)
```
Create folder: kiitec-render/
Add these 4 files:
  ✅ agent.py (copy from docs/connector/)
  ✅ requirements.txt (copy from docs/connector/)
  ✅ .env (create with config values)
  ✅ render.yaml (deployment config)
```

### Step 2: Upload to GitHub (10 min)
```
1. Create GitHub account (if needed)
2. Create new repo: kiitec-connector (public)
3. Upload 4 files
4. Done!
```

### Step 3: Deploy to Render (10 min)
```
1. Create Render account
2. New → Background Worker
3. Connect GitHub repo
4. Add environment variables
5. Deploy
```

---

## 📝 4 Files You Need to Create

### File 1: `.env`
```ini
KIITEC_SYNC_URL=https://YOUR-APP.lovable.app/api/public/connector/sync
KIITEC_CONNECTOR_TOKEN=kc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MIKROTIK_HOST=10.10.0.1
MIKROTIK_PORT=8728
MIKROTIK_USER=connector
MIKROTIK_PASSWORD=YOUR-MIKROTIK-PASSWORD
MIKROTIK_USE_TLS=false
KIITEC_INTERVAL_SECONDS=20
```

### File 2: `render.yaml`
```yaml
services:
  - type: background
    name: kiitec-connector
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: python agent.py
    envVars:
      - key: KIITEC_SYNC_URL
        scope: run
      - key: KIITEC_CONNECTOR_TOKEN
        scope: run
      - key: MIKROTIK_HOST
        scope: run
      - key: MIKROTIK_PORT
        scope: run
      - key: MIKROTIK_USER
        scope: run
      - key: MIKROTIK_PASSWORD
        scope: run
      - key: MIKROTIK_USE_TLS
        scope: run
      - key: KIITEC_INTERVAL_SECONDS
        scope: run
```

### File 3 & 4: Copy from Your Project
```
From: docs/connector/
Copy: agent.py
Copy: requirements.txt
```

---

## 🔑 Environment Variables (For Render Dashboard)

When deploying, add these 8 variables:

| Variable | Value | Example |
|----------|-------|---------|
| KIITEC_SYNC_URL | Your dashboard API | https://myapp.lovable.app/api/public/connector/sync |
| KIITEC_CONNECTOR_TOKEN | Token from dashboard | kc_abc123def456ghi789... |
| MIKROTIK_HOST | MikroTik WireGuard IP | 10.10.0.1 |
| MIKROTIK_PORT | API port | 8728 |
| MIKROTIK_USER | API user | connector |
| MIKROTIK_PASSWORD | User password | strong-password-here |
| MIKROTIK_USE_TLS | Use TLS? | false |
| KIITEC_INTERVAL_SECONDS | Sync interval | 20 |

---

## ✅ Quick Verification

After deploying:

1. **Render shows "Live"**
   - Green status indicator on dashboard

2. **Logs show sync messages**
   - Every 20 seconds: `INFO synced: 0 users, wg=true`

3. **Dashboard shows data**
   - Router Monitor has live metrics
   - Last Sync is recent

4. **Test hotspot**
   - Device connects → redirected to login
   - User appears in Active Sessions

---

## 📁 Folder Structure

```
Your Computer:
  kiitec-render/
    ├── agent.py              ← Copy from project
    ├── requirements.txt      ← Copy from project
    ├── .env                  ← Create with config
    └── render.yaml           ← Create from template

GitHub:
  kiitec-connector/
    ├── agent.py
    ├── requirements.txt
    ├── .env
    └── render.yaml

Render.com:
  Background Worker: kiitec-connector
    ├── Runs 24/7
    ├── Auto-restart
    └── Connects via WireGuard
```

---

## 🔗 Links You'll Need

| What | Link |
|------|------|
| GitHub | https://github.com (sign up) |
| Render | https://render.com (sign up) |
| Dashboard Settings | https://your-app.lovable.app/settings |
| Render Dashboard | https://dashboard.render.com |

---

## 🚀 Copy-Paste Commands

### Generate WireGuard Key on Render
```bash
# Run in Render Shell tab
wg genkey | tee privatekey | wg pubkey > publickey
cat publickey
```

---

## ⏱️ Timeline

| Step | Time | What |
|------|------|------|
| 1. Create files | 5 min | Make 4 files on computer |
| 2. Create GitHub account | 5 min | Sign up & verify email |
| 3. Upload to GitHub | 5 min | Drag & drop 4 files |
| 4. Create Render account | 5 min | Sign up & verify |
| 5. Deploy to Render | 10 min | Connect & deploy |
| 6. Configure MikroTik | 10 min | Add WireGuard peer |
| 7. Verify | 5 min | Check dashboard & logs |
| **TOTAL** | **~45 min** | **Complete!** |

---

## 🆘 Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| Render shows error | Check build logs for details |
| No sync messages in logs | Verify WireGuard tunnel is active |
| Dashboard has no data | Check token matches & tunnel is up |
| Can't find logs | Refresh page (F5) |
| Agent keeps crashing | Check `.env` values are correct |
| Status not "Live" | Wait 2 min or check build errors |

---

## 📞 Quick Help

### Check Status
```
Render Dashboard
  → Select kiitec-connector
  → Status should show "Live"
```

### View Logs
```
Render Dashboard
  → Select kiitec-connector
  → Click "Logs" tab
  → Watch for sync messages
```

### Update Configuration
```
Render Dashboard
  → Select kiitec-connector
  → Click "Environment"
  → Edit variable
  → Service auto-restarts
```

### Check WireGuard
```
MikroTik Winbox
  → Interfaces → WireGuard → Peers
  → Look for LAST-HANDSHAKE (should be recent)
  → Check Rx/Tx bytes (should be non-zero)
```

---

## ✨ Key Points

- ✅ **Completely FREE** (Render free tier)
- ✅ **24/7 Uptime** (background worker, not web service)
- ✅ **Auto-restart** on crash
- ✅ **Easy deployment** via GitHub
- ✅ **No credit card required** (for free tier)
- ✅ **Simple to update** (just push to GitHub)

---

## 🎓 Remember

1. Use **Background Worker** (NOT Web Service)
   - Background = 24/7 uptime
   - Web Service = 15 min inactivity timeout

2. Keep `.env` file with real values
   - Dashboard URL
   - Connector token
   - MikroTik password

3. Keep `render.yaml` deployment config
   - Tells Render how to run your agent

4. Save your credentials securely
   - Connector token
   - MikroTik password
   - GitHub repo URL

---

## 📊 What Render Provides (Free)

```
CPU:        Shared (auto-scaled)
Memory:     512 MB
Storage:    500 MB (temporary)
Network:    Unlimited
Bandwidth:  Unlimited
Support:    Community
Cost:       $0/month

⚠️ Important: Background Worker = 24/7
   (Not Web Service which times out after 15 min inactivity)
```

---

## 🎯 Success Criteria

When everything is working:
- ✅ Render shows "Live"
- ✅ Logs show sync every 20 sec
- ✅ Dashboard shows live data
- ✅ WireGuard shows recent handshake
- ✅ Test hotspot connects
- ✅ Can disconnect users

---

**Start with RENDER_SETUP_GUIDE.md**
**Follow step-by-step**
**Should work perfectly!** ✅
