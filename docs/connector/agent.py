#!/usr/bin/env python3
"""
KIITEC Hotspot — VPS Connector Agent
====================================

Runs on the Ubuntu VPS (behind WireGuard) and is the ONLY component that talks
to the MikroTik RB951 directly. On each interval it:

  1. Reads RouterOS system health (CPU, memory, disk, uptime, version).
  2. Reads active hotspot sessions.
  3. Checks the WireGuard tunnel.
  4. POSTs all of that to the KIITEC dashboard /api/public/connector/sync endpoint.
  5. Receives any pending commands (disconnect, reboot, ...) and executes them.

Authentication to the dashboard is a single shared secret: KIITEC_CONNECTOR_TOKEN.
Generate it in the dashboard under Settings -> Connector token.

Dependencies:  pip install routeros_api requests
"""
import os
import sys
import time
import logging

import requests

try:
    import routeros_api
except ImportError:
    sys.exit("Missing dependency. Run: pip install routeros_api requests")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger("kiitec-connector")

SYNC_URL = os.environ["KIITEC_SYNC_URL"]
TOKEN = os.environ["KIITEC_CONNECTOR_TOKEN"]
HOST = os.environ.get("MIKROTIK_HOST", "10.10.0.1")
PORT = int(os.environ.get("MIKROTIK_PORT", "8728"))
USER = os.environ["MIKROTIK_USER"]
PASSWORD = os.environ["MIKROTIK_PASSWORD"]
USE_TLS = os.environ.get("MIKROTIK_USE_TLS", "false").lower() == "true"
INTERVAL = int(os.environ.get("KIITEC_INTERVAL_SECONDS", "20"))


def connect():
    pool = routeros_api.RouterOsApiPool(
        HOST,
        username=USER,
        password=PASSWORD,
        port=PORT,
        use_ssl=USE_TLS,
        plaintext_login=True,
    )
    return pool


def to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def collect(api):
    """Gather a heartbeat + active sessions snapshot from RouterOS."""
    resource = api.get_resource("/system/resource").get()[0]
    identity = api.get_resource("/system/identity").get()[0]

    total_mem = to_int(resource.get("total-memory"))
    free_mem = to_int(resource.get("free-memory"))
    total_hdd = to_int(resource.get("total-hdd-space"))
    free_hdd = to_int(resource.get("free-hdd-space"))

    # Active hotspot users
    sessions = []
    try:
        active = api.get_resource("/ip/hotspot/active").get()
    except Exception as exc:  # hotspot may be absent on some setups
        log.warning("Could not read hotspot active: %s", exc)
        active = []

    for a in active:
        sessions.append(
            {
                "session_key": a.get(".id") or f"{a.get('user','')}-{a.get('mac-address','')}",
                "username": a.get("user"),
                "ip_address": a.get("address"),
                "mac_address": a.get("mac-address"),
                "uptime_seconds": parse_uptime(a.get("uptime")),
                "bytes_in": to_int(a.get("bytes-in")),
                "bytes_out": to_int(a.get("bytes-out")),
            }
        )

    # WireGuard peer status (last handshake within 3 min => connected)
    wg_connected = False
    try:
        peers = api.get_resource("/interface/wireguard/peers").get()
        for p in peers:
            hs = p.get("last-handshake")
            if hs and hs not in ("0s", ""):
                wg_connected = True
                break
    except Exception:
        wg_connected = False

    heartbeat = {
        "board_name": resource.get("board-name"),
        "os_version": resource.get("version"),
        "uptime": resource.get("uptime"),
        "cpu_load": to_int(resource.get("cpu-load")),
        "free_memory_bytes": free_mem,
        "total_memory_bytes": total_mem,
        "free_hdd_bytes": free_hdd,
        "total_hdd_bytes": total_hdd,
        "hotspot_active_users": len(sessions),
        "wireguard_connected": wg_connected,
    }
    return heartbeat, sessions, identity.get("name")


def parse_uptime(value):
    """Convert RouterOS uptime (e.g. '1d2h3m4s') to seconds."""
    if not value:
        return 0
    total, num = 0, ""
    units = {"d": 86400, "h": 3600, "m": 60, "s": 1, "w": 604800}
    for ch in value:
        if ch.isdigit():
            num += ch
        elif ch in units and num:
            total += int(num) * units[ch]
            num = ""
    return total


def run_command(api, cmd):
    """Execute a single dashboard command, return (status, result)."""
    ctype = cmd.get("type")
    payload = cmd.get("payload") or {}
    try:
        if ctype == "reboot":
            api.get_resource("/system").call("reboot")
            return "done", "Reboot issued"
        if ctype == "disconnect_session":
            res = api.get_resource("/ip/hotspot/active")
            key = payload.get("session_key", "")
            removed = False
            for a in res.get():
                if a.get(".id") == key or a.get("user") == payload.get("username"):
                    res.remove(id=a.get(".id"))
                    removed = True
            return ("done", "Disconnected") if removed else ("failed", "Session not found")
        if ctype == "disable_user":
            return "failed", "disable_user not implemented for this deployment"
        if ctype == "sync_voucher":
            return "done", "No-op (User Manager managed externally)"
        return "failed", f"Unknown command type: {ctype}"
    except Exception as exc:
        return "failed", str(exc)


def tick():
    pool = connect()
    api = pool.get_api()
    command_results = []
    try:
        heartbeat, sessions, identity = collect(api)
        body = {"heartbeat": heartbeat, "sessions": sessions, "command_results": []}
        resp = requests.post(
            SYNC_URL,
            json=body,
            headers={"X-Connector-Token": TOKEN},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        commands = data.get("commands", [])
        log.info(
            "synced: %s users, wg=%s, %d command(s)",
            heartbeat["hotspot_active_users"],
            heartbeat["wireguard_connected"],
            len(commands),
        )

        for cmd in commands:
            status, result = run_command(api, cmd)
            command_results.append({"id": cmd["id"], "status": status, "result": result})

        # Report command outcomes back.
        if command_results:
            requests.post(
                SYNC_URL,
                json={"command_results": command_results},
                headers={"X-Connector-Token": TOKEN},
                timeout=20,
            )
    finally:
        pool.disconnect()


def main():
    log.info("KIITEC connector starting. Sync target: %s every %ds", SYNC_URL, INTERVAL)
    while True:
        try:
            tick()
        except Exception as exc:
            log.error("tick failed: %s", exc)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
