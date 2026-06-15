// Shared, isomorphic helpers for the voucher engine.

export const TZS = (value: number | null | undefined) =>
  new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

/** Human-friendly duration from minutes (e.g. 1440 -> "1 day"). */
export function formatDuration(minutes: number | null | undefined): string {
  const m = Number(minutes ?? 0);
  if (m <= 0) return "—";
  if (m % 43200 === 0) {
    const months = m / 43200;
    return `${months} month${months > 1 ? "s" : ""}`;
  }
  if (m % 10080 === 0) {
    const weeks = m / 10080;
    return `${weeks} week${weeks > 1 ? "s" : ""}`;
  }
  if (m % 1440 === 0) {
    const days = m / 1440;
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  if (m % 60 === 0) {
    const hours = m / 60;
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${m} min`;
}

export function formatSpeed(kbps: number | null | undefined): string {
  const k = Number(kbps ?? 0);
  if (k <= 0) return "—";
  if (k >= 1000) return `${(k / 1000).toFixed(k % 1000 === 0 ? 0 : 1)} Mbps`;
  return `${k} Kbps`;
}

export function formatData(mb: number | null | undefined): string {
  if (mb == null) return "Unlimited";
  if (mb <= 0) return "Unlimited";
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}

export type VoucherStatus = "unused" | "sold" | "active" | "used" | "expired" | "disabled";

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  unused: "Unused",
  sold: "Sold",
  active: "Active",
  used: "Used",
  expired: "Expired",
  disabled: "Disabled",
};

// Tailwind classes mapped to semantic tokens for status badges.
export const VOUCHER_STATUS_STYLES: Record<VoucherStatus, string> = {
  unused: "bg-muted text-muted-foreground",
  sold: "bg-accent text-accent-foreground",
  active: "bg-success/15 text-success",
  used: "bg-primary/10 text-primary",
  expired: "bg-destructive/10 text-destructive",
  disabled: "bg-muted text-muted-foreground line-through",
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit ambiguous 0/O/1/I

/** Generate a random voucher code segment using an unambiguous alphabet. */
export function randomCode(length = 8): string {
  let out = "";
  const bytes = new Uint8Array(length);
  // crypto is available in both browser and worker runtimes.
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}
