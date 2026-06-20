# Direct MikroTik Connection Setup

Your dashboard is now configured to query MikroTik **directly** for real-time data instead of relying on VPS sync.

## Architecture

```
MikroTik Router (10.10.0.1)
        ↓
   WireGuard Tunnel (encrypted)
        ↓
Backend Server (Lovable)
        ↓
Dashboard → Real-time stats
```

## What's Connected

✅ **Active Users** - Live count from MikroTik hotspot
✅ **Online Devices** - Connected sessions
✅ **Router Status** - System info and uptime
❌ **Voucher Data** - Still in Supabase (create packages/vouchers in app)

## Configuration Required

Your backend needs these environment variables set to connect to MikroTik:

```bash
# MikroTik API Connection
MIKROTIK_HOST=10.10.0.1          # Your MikroTik IP (via WireGuard)
MIKROTIK_PORT=8728                # API port (default)
MIKROTIK_USER=connector           # API user you created
MIKROTIK_PASSWORD=your_password   # API password
```

### Where to Set These

**On Lovable Cloud:**
1. Go to Settings → Environment Variables
2. Add each variable above
3. Deploy/restart the app

**On Self-Hosted/Vercel:**
1. Add to `.env.local` or deployment platform settings
2. Restart the server

## Testing the Connection

1. **Go to /diagnostics** page
2. Look for "Hotspot Sessions" test
3. It should show your active users

## Fallback Mode

If MikroTik is not configured, the dashboard shows **demo data** instead of failing. This allows you to develop without a live router.

## Notes

- Data refreshes every **30 seconds**
- No VPS agent sync needed anymore
- Queries run directly from backend to MikroTik
- Requires WireGuard tunnel to be active

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MikroTik not configured" | Set env vars above |
| Connection timeout | Check WireGuard tunnel is up |
| API port 8728 blocked | Enable API service in MikroTik → IP → Services |
| Wrong user/password | Verify in MikroTik → System → Users |

## Next Steps

1. ✅ Verify MikroTik is reachable from backend
2. ✅ Set MIKROTIK_* environment variables
3. ✅ Test dashboard - should show live user counts
4. ✅ Create packages in the app
5. ✅ Generate vouchers and test sales flow
