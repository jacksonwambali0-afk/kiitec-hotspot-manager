// Shared, isomorphic helpers for the MikroTik integration UI.

/** A router is considered online if it checked in within this window. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export function isRouterOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

/** Human-readable bytes (e.g. 1536 -> "1.5 KB"). */
export function formatBytes(bytes: number | null | undefined): string {
  const b = Number(bytes ?? 0);
  if (b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), units.length - 1);
  const value = b / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Percentage of memory/disk used given free + total. */
export function usedPercent(
  free: number | null | undefined,
  total: number | null | undefined,
): number | null {
  const f = Number(free ?? 0);
  const t = Number(total ?? 0);
  if (t <= 0) return null;
  return Math.min(100, Math.max(0, Math.round(((t - f) / t) * 100)));
}

/** Friendly uptime from seconds (e.g. 90061 -> "1d 1h 1m"). */
export function formatUptimeSeconds(seconds: number | null | undefined): string {
  let s = Number(seconds ?? 0);
  if (s <= 0) return "—";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m || parts.length === 0) parts.push(`${m}m`);
  return parts.join(" ");
}

/** Relative time like "12s ago", "5m ago", "2h ago". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
