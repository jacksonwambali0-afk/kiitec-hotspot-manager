/**
 * Server-side MikroTik API Client
 * Uses routeros npm package to connect to MikroTik API
 * This runs on the backend and queries MikroTik directly over WireGuard
 * 
 * Queries directly from:
 * - /ip/hotspot/user-profile (Packages)
 * - /ip/hotspot/user (Vouchers/Users)
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment from docs/connector/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const connectorEnvPath = resolve(__dirname, "../../docs/connector/.env");

function loadConnectorEnv() {
  if (existsSync(connectorEnvPath)) {
    try {
      const content = readFileSync(connectorEnvPath, "utf-8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          const value = valueParts.join("=");
          if (key && value && !process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log("[MikroTik] Loaded env from", connectorEnvPath);
    } catch (err) {
      console.warn("[MikroTik] Failed to load .env from", connectorEnvPath, err instanceof Error ? err.message : "");
    }
  }
}

loadConnectorEnv();

export interface MikroTikConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface Package {
  id: string; // MikroTik .id
  name: string;
  sessionTime?: number; // in seconds
  idleTimeout?: number;
  rateLimit?: string; // "4M/4M" format
  sharedUsers?: number;
}

export interface Voucher {
  id: string; // MikroTik .id
  name: string; // username/code
  profile: string; // package name
  disabled?: boolean;
  uptime?: string;
  bytesIn?: number;
  bytesOut?: number;
  packetsIn?: number;
  packetsOut?: number;
}

// Get config from environment
export function getMikroTikConfig(): MikroTikConfig | null {
  const host = process.env.MIKROTIK_HOST;
  const port = process.env.MIKROTIK_PORT;
  const user = process.env.MIKROTIK_USER;
  const password = process.env.MIKROTIK_PASSWORD;

  if (!host || !user || !password) {
    console.warn("[MikroTik] Missing configuration:", {
      host: !!host,
      user: !!user,
      password: !!password,
    });
    return null;
  }

  return {
    host,
    port: port ? parseInt(port) : 8728,
    user,
    password,
  };
}

/**
 * Query MikroTik API using RouterOS protocol
 * Requires routeros package: npm install routeros
 */
function getMikroTikRouterParams(params: Record<string, any> = {}) {
  return Object.entries(params).flatMap(([key, value]) => {
    if (value === undefined || value === null) return [];
    return [`=${key}=${String(value)}`];
  });
}

async function createMikroTikConnection() {
  const config = getMikroTikConfig();
  if (!config) {
    throw new Error(
      "MikroTik not configured. Set MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASSWORD env vars",
    );
  }

  let RouterOS: any;
  try {
    RouterOS = await import("routeros");
  } catch (e) {
    console.warn("[MikroTik] routeros import failed:", e instanceof Error ? e.message : String(e));
    return null;
  }

  const conn = new RouterOS.RouterOSAPI({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  });

  await conn.connect();
  return conn;
}

async function queryMikroTikAPI(command: string, params: string[] = []) {
  try {
    const conn = await createMikroTikConnection();
    if (!conn) {
      console.warn("[MikroTik] routeros package not installed, returning demo data");
      return getDemoData(command);
    }

    try {
      // For read operations, append /print to the command path
      const queryCommand = command.endsWith("/print") ? command : `${command}/print`;
      console.log(`[MikroTik] Executing: ${queryCommand}`, params.length > 0 ? `with params: ${params}` : "");
      const data = await conn.write(queryCommand, params);
      console.log(`[MikroTik] Success: ${queryCommand}`, `received ${Array.isArray(data) ? data.length : 1} item(s)`);
      return data;
    } finally {
      conn.close();
    }
  } catch (err) {
    console.error(`[MikroTik] Error on ${command}:`, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

function getMikroTikIdentifierParams(identifier: { id?: string; name?: string }) {
  if (identifier.id) return [`=.id=${identifier.id}`];
  if (identifier.name) return [`=name=${identifier.name}`];
  throw new Error("MikroTik identifier required: id or name");
}

/**
 * Send command to MikroTik (add, set, remove)
 */
async function sendMikroTikCommand(command: string, params: string[] = []) {
  try {
    const conn = await createMikroTikConnection();
    if (!conn) {
      console.warn("[MikroTik] routeros package not installed, skipping command");
      return { success: true };
    }

    try {
      const data = await conn.write(command, params);
      return data;
    } finally {
      conn.close();
    }
  } catch (err) {
    console.error("[MikroTik] Error:", err);
    throw err;
  }
}

// ============ PACKAGES (User Profiles) ============

/**
 * Get all packages from MikroTik
 * On this MikroTik, user-profiles aren't directly queryable,
 * so we extract profile names from existing users
 */
export async function getPackages(): Promise<Package[]> {
  try {
    console.log("[MikroTik] Fetching packages...");
    
    // Try to query profiles directly first
    const paths = [
      "/ip/hotspot/user-profile",
      "/user/profile",
      "/profile",
    ];
    
    for (const path of paths) {
      try {
        console.log(`[MikroTik] Trying direct path: ${path}`);
        const profiles = await queryMikroTikAPI(path, []);
        if (Array.isArray(profiles) && profiles.length > 0) {
          console.log(`[MikroTik] Found ${profiles.length} profiles at ${path}`);
          return profiles.map((p: any) => ({
            id: p[".id"],
            name: p.name,
            sessionTime: p["session-time"] ? parseTime(p["session-time"]) : undefined,
            idleTimeout: p["idle-timeout"] ? parseTime(p["idle-timeout"]) : undefined,
            rateLimit: p["rate-limit"],
            sharedUsers: p["shared-users"],
          }));
        }
      } catch (err) {
        console.log(`[MikroTik] Direct path ${path} not available`);
      }
    }
    
    // Fallback: Extract profile names from existing users
    console.log("[MikroTik] Extracting profile names from existing users...");
    try {
      const users = await queryMikroTikAPI("/ip/hotspot/user", []);
      if (Array.isArray(users) && users.length > 0) {
        // Get unique profile names from users
        const uniqueProfiles = new Map<string, Package>();
        users.forEach((user: any) => {
          const profileName = user.profile || user.name || "default";
          if (!uniqueProfiles.has(profileName)) {
            uniqueProfiles.set(profileName, {
              id: `profile-${profileName}`,
              name: profileName,
              // Profile details aren't available, so we use defaults or extract from users
            });
          }
        });
        const profiles = Array.from(uniqueProfiles.values());
        console.log(`[MikroTik] Extracted ${profiles.length} unique profile names from users`);
        return profiles;
      }
    } catch (err) {
      console.log("[MikroTik] Failed to extract profiles from users");
    }
    
    // If all else fails, return empty array
    console.warn("[MikroTik] No packages found, returning empty array");
    return [];
  } catch (err) {
    console.error("[MikroTik] Failed to fetch packages:", err);
    return [];
  }
}

/**
 * Create a new package
 */
export async function createPackage(pkg: {
  name: string;
  sessionTime?: string; // "1d", "1h", "30m"
  rateLimit?: string; // "4M/4M" format
  sharedUsers?: number;
}): Promise<string> {
  try {
    console.log("[MikroTik] Creating package:", pkg.name);
    const params = getMikroTikRouterParams({
      name: pkg.name,
      "session-time": pkg.sessionTime,
      "rate-limit": pkg.rateLimit,
      "shared-users": pkg.sharedUsers,
    });
    const result = await sendMikroTikCommand("/ip/hotspot/user-profile/add", params);
    return result?.[0]?.ret || "success";
  } catch (err) {
    console.error("[MikroTik] Failed to create package:", err);
    throw err;
  }
}

/**
 * Update an existing package
 * Note: RouterOS /set expects .id, not name. If only name is provided, we query first.
 */
export async function updatePackage(
  identifier: { id?: string; name?: string },
  pkg: {
    name?: string;
    sessionTime?: string;
    rateLimit?: string;
    sharedUsers?: number;
  },
): Promise<void> {
  try {
    console.log("[MikroTik] Updating package:", identifier);
    
    let idToUpdate = identifier.id;
    
    // If only name is provided, fetch the profile to get the .id
    if (!idToUpdate && identifier.name) {
      console.log("[MikroTik] Fetching profile by name to get .id:", identifier.name);
      const profiles = await queryMikroTikAPI("/ip/hotspot/user-profile/print", [
        `=name=${identifier.name}`,
      ]);
      if (Array.isArray(profiles) && profiles.length > 0) {
        idToUpdate = profiles[0][".id"];
        console.log("[MikroTik] Found profile .id:", idToUpdate);
      } else {
        throw new Error(`Profile not found: ${identifier.name}`);
      }
    }
    
    if (!idToUpdate) {
      throw new Error("MikroTik identifier required: id or name");
    }
    
    const params = [
      `=.id=${idToUpdate}`,
      ...getMikroTikRouterParams({
        name: pkg.name,
        "session-time": pkg.sessionTime,
        "rate-limit": pkg.rateLimit,
        "shared-users": pkg.sharedUsers,
      }),
    ];
    await sendMikroTikCommand("/ip/hotspot/user-profile/set", params);
  } catch (err) {
    console.error("[MikroTik] Failed to update package:", err);
    throw err;
  }
}

/**
 * Delete a package
 * Note: RouterOS requires .id for removal, not name. If only name is provided, we query first.
 */
export async function deletePackage(identifier: { id?: string; name?: string }): Promise<void> {
  try {
    console.log("[MikroTik] Deleting package:", identifier);
    
    let idToRemove = identifier.id;
    
    // If only name is provided, fetch the profile to get the .id
    if (!idToRemove && identifier.name) {
      console.log("[MikroTik] Fetching profile by name to get .id:", identifier.name);
      const profiles = await queryMikroTikAPI("/ip/hotspot/user-profile/print", [
        `=name=${identifier.name}`,
      ]);
      if (Array.isArray(profiles) && profiles.length > 0) {
        idToRemove = profiles[0][".id"];
        console.log("[MikroTik] Found profile .id:", idToRemove);
      } else {
        throw new Error(`Profile not found: ${identifier.name}`);
      }
    }
    
    if (!idToRemove) {
      throw new Error("MikroTik identifier required: id or name");
    }
    
    // Remove by .id
    await sendMikroTikCommand("/ip/hotspot/user-profile/remove", [`=.id=${idToRemove}`]);
  } catch (err) {
    console.error("[MikroTik] Failed to delete package:", err);
    throw err;
  }
}

// ============ VOUCHERS (Hotspot Users) ============

/**
 * Get all vouchers/users from MikroTik
 */
export async function getVouchers(): Promise<Voucher[]> {
  try {
    console.log("[MikroTik] Fetching vouchers...");
    const users = await queryMikroTikAPI("/ip/hotspot/user/print", []);
    
    return (Array.isArray(users) ? users : []).map((u: any) => ({
      id: u[".id"],
      name: u.name,
      profile: u.profile,
      disabled: u.disabled === "true",
      uptime: u.uptime,
      bytesIn: parseInt(u["bytes-in"] || 0),
      bytesOut: parseInt(u["bytes-out"] || 0),
      packetsIn: parseInt(u["packets-in"] || 0),
      packetsOut: parseInt(u["packets-out"] || 0),
    }));
  } catch (err) {
    console.error("[MikroTik] Failed to fetch vouchers:", err);
    throw err;
  }
}

/**
 * Create a new voucher/user
 */
export async function createVoucher(voucher: {
  name: string; // username/code
  password: string;
  profile: string; // package name
  comment?: string;
}): Promise<string> {
  try {
    console.log("[MikroTik] Creating voucher:", voucher.name);
    const params = getMikroTikRouterParams({
      name: voucher.name,
      password: voucher.password,
      profile: voucher.profile,
      comment: voucher.comment,
    });
    const result = await sendMikroTikCommand("/ip/hotspot/user/add", params);
    return result?.[0]?.ret || "success";
  } catch (err) {
    console.error("[MikroTik] Failed to create voucher:", err);
    throw err;
  }
}

/**
 * Update a voucher (enable/disable, change profile)
 * Note: RouterOS /set expects .id, not name. If only name is provided, we query first.
 */
export async function updateVoucher(
  identifier: { id?: string; name?: string },
  updates: { disabled?: boolean; profile?: string; comment?: string },
): Promise<void> {
  try {
    console.log("[MikroTik] Updating voucher:", identifier);
    
    let idToUpdate = identifier.id;
    
    // If only name is provided, fetch the user to get the .id
    if (!idToUpdate && identifier.name) {
      console.log("[MikroTik] Fetching user by name to get .id:", identifier.name);
      const users = await queryMikroTikAPI("/ip/hotspot/user/print", [
        `=name=${identifier.name}`,
      ]);
      if (Array.isArray(users) && users.length > 0) {
        idToUpdate = users[0][".id"];
        console.log("[MikroTik] Found user .id:", idToUpdate);
      } else {
        throw new Error(`User not found: ${identifier.name}`);
      }
    }
    
    if (!idToUpdate) {
      throw new Error("MikroTik identifier required: id or name");
    }
    
    const params = [
      `=.id=${idToUpdate}`,
      ...(updates.disabled !== undefined
        ? [`=disabled=${updates.disabled ? "true" : "false"}`]
        : []),
      ...(updates.profile !== undefined ? [`=profile=${updates.profile}`] : []),
      ...(updates.comment !== undefined ? [`=comment=${updates.comment}`] : []),
    ];
    await sendMikroTikCommand("/ip/hotspot/user/set", params);
  } catch (err) {
    console.error("[MikroTik] Failed to update voucher:", err);
    throw err;
  }
}

/**
 * Delete a voucher
 * Note: RouterOS requires .id for removal, not name. If only name is provided, we query first.
 */
export async function deleteVoucher(identifier: { id?: string; name?: string }): Promise<void> {
  try {
    console.log("[MikroTik] Deleting voucher:", identifier);
    
    let idToRemove = identifier.id;
    
    // If only name is provided, fetch the user to get the .id
    if (!idToRemove && identifier.name) {
      console.log("[MikroTik] Fetching user by name to get .id:", identifier.name);
      const users = await queryMikroTikAPI("/ip/hotspot/user/print", [
        `=name=${identifier.name}`,
      ]);
      if (Array.isArray(users) && users.length > 0) {
        idToRemove = users[0][".id"];
        console.log("[MikroTik] Found user .id:", idToRemove);
      } else {
        throw new Error(`User not found: ${identifier.name}`);
      }
    }
    
    if (!idToRemove) {
      throw new Error("MikroTik identifier required: id or name");
    }
    
    // Remove by .id
    await sendMikroTikCommand("/ip/hotspot/user/remove", [`=.id=${idToRemove}`]);
  } catch (err) {
    console.error("[MikroTik] Failed to delete voucher:", err);
    throw err;
  }
}

// ============ ACTIVE SESSIONS ============

/**
 * Get active hotspot sessions
 */
export async function getActiveSessions() {
  try {
    console.log("[MikroTik] Fetching active sessions...");
    const sessions = await queryMikroTikAPI("/ip/hotspot/active", []);
    
    return {
      sessions: Array.isArray(sessions)
        ? sessions.map((s: any) => ({
            username: s.user || "Unknown",
            ip: s.address || "",
            mac: s["mac-address"] || "",
            uptime: formatUptime(s.uptime),
            bytesIn: parseInt(s["bytes-in"] || 0),
            bytesOut: parseInt(s["bytes-out"] || 0),
            packetsIn: parseInt(s["packets-in"] || 0),
            packetsOut: parseInt(s["packets-out"] || 0),
          }))
        : [],
    };
  } catch (err) {
    console.error("[MikroTik] Failed to get active sessions:", err);
    throw err;
  }
}

/**
 * Get router statistics
 */
export async function getRouterStats() {
  try {
    console.log("[MikroTik] Fetching router stats...");
    
    const [sysInfo, resources] = await Promise.all([
      queryMikroTikAPI("/system/identity", []),
      queryMikroTikAPI("/system/resource", []),
    ]);

    const activeSessionsData = await getActiveSessions();

    return {
      activeUsers: activeSessionsData.sessions.length,
      sessions: activeSessionsData.sessions,
      uptime: resources[0]?.uptime || "0s",
      cpuUsage: resources[0]?.["cpu-load"] || 0,
      memoryUsage: calculateMemoryUsage(resources[0]),
      name: sysInfo[0]?.name || "MikroTik Router",
    };
  } catch (err) {
    console.error("[MikroTik] Failed to get stats:", err);
    throw err;
  }
}

/**
 * Get online device count
 */
export async function getOnlineDeviceCount() {
  try {
    console.log("[MikroTik] Counting online devices...");
    const sessions = await getActiveSessions();
    return {
      count: sessions.sessions.length,
    };
  } catch (err) {
    console.error("[MikroTik] Failed to get online devices:", err);
    throw err;
  }
}

// ============ HELPER FUNCTIONS ============

function parseTime(timeStr: string | number): number {
  if (!timeStr) return 0;
  if (typeof timeStr === "number") return timeStr;
  
  // Parse "1d", "1h", "30m" format
  const match = String(timeStr).match(/(\d+)([dhm])/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case "d": return value * 24 * 60 * 60;
    case "h": return value * 60 * 60;
    case "m": return value * 60;
    default: return 0;
  }
}

function formatUptime(uptimeStr: string | number): string {
  if (!uptimeStr) return "0s";
  if (typeof uptimeStr === "number") return `${uptimeStr}ms`;
  return String(uptimeStr);
}

function calculateMemoryUsage(resource: any): number {
  if (!resource) return 0;
  const used = resource["used-memory"] || 0;
  const total = resource["total-memory"] || 1;
  return Math.round((used / total) * 100);
}

/**
 * Demo data for development/testing when routeros is not installed
 */
function getDemoData(path: string) {
  const normalized = path.replace(/\/print$/, "");

  if (normalized === "/ip/hotspot/user-profile") {
    return [
      { ".id": "*1", name: "1Day", "rate-limit": "4M/4M", "session-time": "1d" },
      { ".id": "*2", name: "1Hour", "rate-limit": "5M/5M", "session-time": "1h" },
      { ".id": "*3", name: "2Days", "rate-limit": "6M/6M", "session-time": "2d" },
    ];
  }

  if (normalized === "/ip/hotspot/user") {
    return [
      { ".id": "*1", name: "test_user_1", password: "pass123", profile: "1Day" },
      { ".id": "*2", name: "test_user_2", password: "pass456", profile: "2Days" },
    ];
  }

  if (normalized === "/ip/hotspot/active") {
    return [
      {
        ".id": "*1",
        user: "test_user_1",
        address: "10.10.2.101",
        "mac-address": "00:11:22:33:44:55",
        uptime: 3600000,
        "bytes-in": 1024000,
        "bytes-out": 512000,
      },
    ];
  }

  return [];
}
