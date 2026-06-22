/**
 * Client-side hooks for MikroTik Packages and Vouchers
 * These fetch from the backend API which queries MikroTik directly
 */

export interface Package {
  id: string;
  name: string;
  sessionTime?: number;
  idleTimeout?: number;
  rateLimit?: string;
  sharedUsers?: number;
}

export interface Voucher {
  id: string;
  name: string;
  profile: string;
  disabled?: boolean;
  uptime?: string;
  bytesIn?: number;
  bytesOut?: number;
  packetsIn?: number;
  packetsOut?: number;
}

/**
 * Fetch all packages from MikroTik
 */
export async function fetchPackages(): Promise<Package[]> {
  const res = await authedFetch("/api/mikrotik/packages");
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch packages: ${error}`);
  }
  const data = await res.json();
  return data.packages || [];
}

/**
 * Create a new package in MikroTik
 */
export async function createPackage(pkg: {
  name: string;
  sessionTime?: string;
  rateLimit?: string;
  sharedUsers?: number;
}): Promise<string> {
  const res = await authedFetch("/api/mikrotik/packages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pkg),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create package");
  }
  const data = await res.json();
  return data.id;
}

export async function updatePackage(
  target: { id?: string; profileName?: string },
  pkg: { name?: string; sessionTime?: string; rateLimit?: string; sharedUsers?: number },
): Promise<void> {
  const res = await authedFetch("/api/mikrotik/packages", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, ...pkg }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update package");
  }
}

/**
 * Delete a package from MikroTik
 */
export async function deletePackage(identifier: { id?: string; profileName?: string }): Promise<void> {
  const res = await authedFetch("/api/mikrotik/packages", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(identifier),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete package");
  }
}

/**
 * Fetch all vouchers from MikroTik
 */
export async function fetchVouchers(): Promise<Voucher[]> {
  const res = await authedFetch("/api/mikrotik/vouchers");
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch vouchers: ${error}`);
  }
  const data = await res.json();
  return data.vouchers || [];
}

/**
 * Create a new voucher in MikroTik
 */
export async function createVoucher(voucher: {
  name: string;
  password: string;
  profile: string;
  comment?: string;
}): Promise<string> {
  const res = await authedFetch("/api/mikrotik/vouchers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(voucher),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create voucher");
  }
  const data = await res.json();
  return data.id;
}

/**
 * Update a voucher in MikroTik
 */
export async function updateVoucher(
  target: { id?: string; username?: string },
  updates: { disabled?: boolean; profile?: string; comment?: string },
): Promise<void> {
  const res = await authedFetch("/api/mikrotik/vouchers", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...target, ...updates }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update voucher");
  }
}

/**
 * Delete a voucher from MikroTik
 */
export async function deleteVoucher(identifier: { id?: string; username?: string }): Promise<void> {
  const res = await authedFetch("/api/mikrotik/vouchers", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(identifier),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to delete voucher");
  }
}

/**
 * Fetch available MikroTik profile names from live packages
 */
export async function fetchAvailableProfiles(): Promise<string[]> {
  try {
    const packages = await fetchPackages();
    const profiles = new Set<string>();
    packages.forEach((pkg) => {
      if (pkg.name) profiles.add(pkg.name);
    });
    return Array.from(profiles).sort();
  } catch (err) {
    console.error("Failed to fetch available profiles:", err);
    return [];
  }
}
