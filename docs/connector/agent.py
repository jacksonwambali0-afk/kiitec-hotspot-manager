#!/usr/bin/env python3
"""
KIITEC Hotspot — Render Web Service Connector Agent (FINAL FIXED)
"""

import os
import sys
import time
import logging
import threading
import requests
from flask import Flask
from dotenv import load_dotenv

load_dotenv()

try:
    import routeros_api
except ImportError:
    sys.exit("Missing dependency. Run: pip install -r requirements.txt")

# =========================
# LOGGING
# =========================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("kiitec-connector")

# =========================
# ENVIRONMENT
# =========================
SYNC_URL = os.environ["KIITEC_SYNC_URL"]
TOKEN = os.environ["KIITEC_CONNECTOR_TOKEN"]

HOST = os.environ.get("MIKROTIK_HOST", "10.10.0.1")
PORT = int(os.environ.get("MIKROTIK_PORT", "8728"))
USER = os.environ["MIKROTIK_USER"]
PASSWORD = os.environ["MIKROTIK_PASSWORD"]

USE_TLS = os.environ.get("MIKROTIK_USE_TLS", "false").lower() == "true"
INTERVAL = int(os.environ.get("KIITEC_INTERVAL_SECONDS", "20"))

# =========================
# FLASK HEALTH CHECK
# =========================
app = Flask(__name__)

@app.route("/")
def health():
    return {"status": "running", "service": "KIITEC Connector"}, 200


# =========================
# MIKROTIK CONNECTION
# =========================
def connect():
    return routeros_api.RouterOsApiPool(
        HOST,
        username=USER,
        password=PASSWORD,
        port=PORT,
        use_ssl=USE_TLS,
        plaintext_login=True,
    )


# =========================
# HELPERS
# =========================
def to_int(val, default=0):
    try:
        return int(val)
    except:
        return default


def parse_uptime(value):
    if not value:
        return 0

    total = 0
    num = ""

    units = {"w":604800,"d":86400,"h":3600,"m":60,"s":1}

    for ch in value:
        if ch.isdigit():
            num += ch
        elif ch in units and num:
            total += int(num) * units[ch]
            num = ""

    return total


# =========================
# WIREGUARD STATUS
# =========================
def wireguard_connected(api):
    """True if any WireGuard peer handshaked within the last ~3 minutes."""
    try:
        peers = api.get_resource("/interface/wireguard/peers").get()
    except Exception as e:
        log.warning("WireGuard read failed: %s", e)
        return None

    for p in peers:
        handshake = parse_uptime(p.get("last-handshake"))
        # last-handshake counts UP from the last handshake; small = recent.
        if handshake and handshake <= 180:
            return True
    return False if peers else None


# =========================
# DATA COLLECTION
# =========================
def collect(api):
    resource = api.get_resource("/system/resource").get()[0]

    sessions = []

    try:
        active = api.get_resource("/ip/hotspot/active").get()
    except Exception as e:
        log.warning("Hotspot read failed: %s", e)
        active = []

    for a in active:
        sessions.append({
            "session_key": a.get(".id"),
            "username": a.get("user"),
            "ip_address": a.get("address"),
            "mac_address": a.get("mac-address"),
            "login_at": a.get("login-by") and None or None,  # placeholder, see below
            "uptime_seconds": parse_uptime(a.get("uptime")),
            "bytes_in": to_int(a.get("bytes-in")),
            "bytes_out": to_int(a.get("bytes-out")),
        })

    # Derive login_at from uptime so the dashboard can show a real timestamp.
    now = time.time()
    for s, a in zip(sessions, active):
        up = parse_uptime(a.get("uptime"))
        if up:
            s["login_at"] = (
                __import__("datetime")
                .datetime.utcfromtimestamp(now - up)
                .replace(microsecond=0)
                .isoformat() + "Z"
            )
        else:
            s["login_at"] = None

    heartbeat = {
        "board_name": resource.get("board-name"),
        "os_version": resource.get("version"),
        "uptime": resource.get("uptime"),
        "cpu_load": to_int(resource.get("cpu-load")),
        "free_memory_bytes": to_int(resource.get("free-memory")),
        "total_memory_bytes": to_int(resource.get("total-memory")),
        "free_hdd_bytes": to_int(resource.get("free-hdd-space")),
        "total_hdd_bytes": to_int(resource.get("total-hdd-space")),
        "hotspot_active_users": len(sessions),
        "wireguard_connected": wireguard_connected(api),
    }

    return heartbeat, sessions


# =========================
# COMMAND EXECUTION
# =========================
def run_command(api, cmd):
    ctype = cmd.get("type")
    payload = cmd.get("payload") or {}

    try:
        if ctype == "disconnect_session":
            res = api.get_resource("/ip/hotspot/active")

            for a in res.get():
                if (
                    a.get(".id") == payload.get("session_key")
                    or a.get("user") == payload.get("username")
                ):
                    res.remove(id=a.get(".id"))
                    return "done", "Disconnected"

            return "failed", "Session not found"

        if ctype == "reboot":
            api.get_resource("/system").call("reboot")
            return "done", "Reboot sent"

        return "failed", f"Unknown command: {ctype}"

    except Exception as e:
        return "failed", str(e)


# =========================
# SYNC LOOP
# =========================
def tick():
    pool = connect()

    try:
        api = pool.get_api()

        heartbeat, sessions = collect(api)

        # 🔥 FIXED PAYLOAD (Lovable expects this)
        payload = {
            "router": {
                "heartbeat": heartbeat,
                "sessions": sessions,
            },
            "command_results": [],
        }

        r = requests.post(
            SYNC_URL,
            json=payload,
            headers={
                "X-Connector-Token": TOKEN,
                "Content-Type": "application/json",
            },
            timeout=20,
        )

        # 🔍 DEBUG RESPONSE (IMPORTANT)
        if r.status_code != 200:
            log.error("SYNC FAILED: %s", r.text)

        r.raise_for_status()

        data = r.json()
        commands = data.get("commands", [])

        log.info(
            "users=%d commands=%d",
            heartbeat["hotspot_active_users"],
            len(commands),
        )

        results = []

        for cmd in commands:
            status, result = run_command(api, cmd)

            results.append({
                "id": cmd["id"],
                "status": status,
                "result": result,
            })

        if results:
            requests.post(
                SYNC_URL,
                json={"command_results": results},
                headers={
                    "X-Connector-Token": TOKEN,
                    "Content-Type": "application/json",
                },
                timeout=20,
            )

    finally:
        pool.disconnect()


# =========================
# BACKGROUND LOOP
# =========================
def connector_loop():
    log.info(
        "Connector started → %s every %ds",
        SYNC_URL,
        INTERVAL,
    )

    while True:
        try:
            tick()
        except Exception as e:
            log.error("Tick error: %s", e)

        time.sleep(INTERVAL)


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    threading.Thread(target=connector_loop, daemon=True).start()

    port = int(os.environ.get("PORT", 10000))

    app.run(
        host="0.0.0.0",
        port=port,
    )