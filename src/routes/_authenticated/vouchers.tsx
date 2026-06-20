import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Copy,
  Ban,
  Trash2,
  Ticket,
  BadgeDollarSign,
  Printer,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  TZS,
  VOUCHER_STATUS_LABELS,
  VOUCHER_STATUS_STYLES,
  type VoucherStatus,
} from "@/lib/voucher-utils";
import { fetchVouchers as fetchMikrotikVouchers, type Voucher as MikroTikVoucher } from "@/lib/mikrotik-client";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { GenerateVouchersDialog } from "@/components/vouchers/GenerateVouchersDialog";
import { SellVoucherDialog } from "@/components/vouchers/SellVoucherDialog";
import { PrintVouchersDialog } from "@/components/vouchers/PrintVouchersDialog";
import type { VoucherRow } from "@/components/vouchers/voucher-types";
import type { PackageRow } from "@/components/packages/PackageDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "cashier"]}>
      <VouchersPage />
    </RoleGuard>
  ),
});

const STATUS_FILTERS: ("all" | VoucherStatus)[] = [
  "all",
  "unused",
  "sold",
  "active",
  "used",
  "expired",
  "disabled",
];

type VoucherViewRow = VoucherRow & {
  liveId: string;
  username: string;
  profile: string;
  disabled: boolean;
  liveUptime?: string;
  liveBytesIn?: number;
  liveBytesOut?: number;
  livePacketsIn?: number;
  livePacketsOut?: number;
  package?: { name: string; duration_minutes: number } | null;
  package_id: string | null;
};

async function fetchPackages(): Promise<PackageRow[]> {
  const { data, error } = await supabase
    .from("packages")
    .select(
      "id, name, description, price, duration_minutes, speed_down_kbps, speed_up_kbps, data_limit_mb, device_limit, mikrotik_profile, is_active",
    )
    .order("name");
  if (error) throw error;
  return (data ?? []) as PackageRow[];
}

async function fetchVouchers(status: string, packageId: string): Promise<VoucherViewRow[]> {
  try {
    console.log("[fetchVouchers] Fetching live MikroTik vouchers");
    const [liveVouchers, packagesMeta] = await Promise.all([
      fetchMikrotikVouchers(),
      supabase
        .from("packages")
        .select("id, name, duration_minutes, mikrotik_profile, period_mode")
        .order("name"),
    ]);

    const packageMeta = (packagesMeta.data ?? []) as PackageRow[];

    // Fetch DB vouchers for any live usernames so we can merge activation/expires data
    const liveNames = (liveVouchers || []).map((v) => v.name).filter(Boolean);
    const { data: dbVouchers = [] } = liveNames.length
      ? await supabase.from("vouchers").select("id, username, price, status, sold_at, buyer_name, buyer_phone, activated_at, expires_at, package_id").in("username", liveNames)
      : { data: [] };

    const dbByUsername = new Map<string, any>();
    (dbVouchers || []).forEach((d: any) => dbByUsername.set(d.username, d));

    return (liveVouchers || []).map((live) => {
      const matchedPackage = packageMeta.find(
        (pkg) => pkg.mikrotik_profile === live.profile || pkg.name === live.profile,
      );

      const db = dbByUsername.get(live.name);

      return {
        id: db?.id ?? live.id,
        liveId: live.id,
        code: live.name,
        username: live.name,
        password: "",
        status: db?.status ?? (live.disabled ? "disabled" : "unused"),
        price: db?.price ?? matchedPackage?.price ?? 0,
        package_id: db?.package_id ?? matchedPackage?.id ?? null,
        batch_id: null,
        sold_at: db?.sold_at ?? null,
        buyer_name: db?.buyer_name ?? null,
        buyer_phone: db?.buyer_phone ?? null,
        expires_at: db?.expires_at ?? null,
        activated_at: db?.activated_at ?? null,
        bound_mac: null,
        comment: null,
        created_at: new Date().toISOString(),
        profile: live.profile,
        disabled: live.disabled ?? false,
        liveUptime: live.uptime,
        liveBytesIn: live.bytesIn,
        liveBytesOut: live.bytesOut,
        livePacketsIn: live.packetsIn,
        livePacketsOut: live.packetsOut,
        package: matchedPackage ? { name: matchedPackage.name, duration_minutes: matchedPackage.duration_minutes } : null,
      } as VoucherViewRow;
    });
  } catch (err) {
    console.error("[fetchVouchers] Unexpected error:", err);
    throw err;
  }
}

function VouchersPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selling, setSelling] = useState<VoucherRow | null>(null);
  const [toDelete, setToDelete] = useState<VoucherRow | null>(null);
  const [toPrint, setToPrint] = useState<VoucherRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");

  const { data: packages = [], error: packagesError } = useQuery({ queryKey: ["packages"], queryFn: fetchPackages });

  const { data: vouchers, isLoading, error: vouchersError } = useQuery<VoucherViewRow[]>({
    queryKey: ["vouchers", statusFilter, packageFilter],
    queryFn: () => fetchVouchers(statusFilter, packageFilter),
  });

  const { data: stats, error: statsError } = useQuery({
    queryKey: ["voucher-stats"],
    queryFn: async () => {
      try {
        console.log("[fetchVoucherStats] Starting stats query");
        const statuses: VoucherStatus[] = ["unused", "sold", "active", "used", "expired"];
        const counts = await Promise.all(
          statuses.map(async (s) => {
            const { count, error } = await supabase
              .from("vouchers")
              .select("*", { count: "exact", head: true })
              .eq("status", s);
            if (error) {
              console.error("[fetchVoucherStats] Error counting status", s, ":", error);
              throw error;
            }
            return [s, count ?? 0] as const;
          }),
        );
        console.log("[fetchVoucherStats] Success");
        return Object.fromEntries(counts) as Record<VoucherStatus, number>;
      } catch (err) {
        console.error("[fetchVoucherStats] Failed:", err);
        throw err;
      }
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, username }: { id: string; status: VoucherStatus; username?: string }) => {
      if (status === "disabled" && username) {
        const { updateVoucher } = await import("@/lib/mikrotik-client");
        await updateVoucher({ username }, { disabled: true });
      }
      const { error } = await supabase.from("vouchers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher-stats"] });
      toast.success("Voucher updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, username }: { id: string; username?: string }) => {
      if (username) {
        const { deleteVoucher } = await import("@/lib/mikrotik-client");
        await deleteVoucher({ username });
      }
      const { error } = await supabase.from("vouchers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher-stats"] });
      toast.success("Voucher deleted");
      setToDelete(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const filtered = useMemo(() => {
    if (!vouchers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return vouchers;
    return vouchers.filter(
      (v) =>
        v.code.toLowerCase().includes(q) ||
        v.buyer_name?.toLowerCase().includes(q) ||
        v.buyer_phone?.toLowerCase().includes(q),
    );
  }, [vouchers, search]);

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success("Code copied");
  };

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = filtered.length > 0 && filtered.every((v) => selected.has(v.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filtered.map((v) => v.id)));

  const printSelected = () => {
    const rows = filtered.filter((v) => selected.has(v.id));
    if (rows.length === 0) return toast.error("Select at least one voucher to print");
    setToPrint(rows);
  };

  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Generate batches, sell, and track the lifecycle of every voucher."
        actions={
          <>
            <Button variant="outline" onClick={printSelected} disabled={selected.size === 0}>
              <Printer className="mr-2 h-4 w-4" /> Print
              {selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
            <Button onClick={() => setGenerateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Generate
            </Button>
          </>
        }
      />

      {(vouchersError || packagesError || statsError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>
            {vouchersError instanceof Error && `Vouchers: ${vouchersError.message}`}
            {packagesError instanceof Error && `Packages: ${packagesError.message}`}
            {statsError instanceof Error && `Stats: ${statsError.message}`}
            {!vouchersError && !packagesError && !statsError && "Failed to load voucher data"}
          </AlertDescription>
        </Alert>
      )}


      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Unused" value={stats?.unused} status="unused" />
        <StatCard label="Sold" value={stats?.sold} status="sold" />
        <StatCard label="Active" value={stats?.active} status="active" />
        <StatCard label="Used" value={stats?.used} status="used" />
        <StatCard label="Expired" value={stats?.expired} status="expired" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, buyer name or phone"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : VOUCHER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All packages</SelectItem>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onGenerate={() => setGenerateOpen(true)} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Activated</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id} data-state={selected.has(v.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(v.id)}
                          onCheckedChange={() => toggleOne(v.id)}
                          aria-label={`Select ${v.code}`}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => copyCode(v.code)}
                          className="flex items-center gap-1.5 font-mono font-medium hover:text-primary"
                          title="Copy code"
                        >
                          {v.code}
                          <Copy className="h-3 w-3 opacity-50" />
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">{v.package?.name ?? "—"}</TableCell>
                      <TableCell className="font-medium">{TZS(v.price)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.activated_at ? new Date(v.activated_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.expires_at ? new Date(v.expires_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${VOUCHER_STATUS_STYLES[v.status]}`}
                        >
                          {VOUCHER_STATUS_LABELS[v.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.buyer_name || v.buyer_phone || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setToPrint([v])}
                            aria-label="Print voucher"
                            title="Print card"
                          >
                            <Printer className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          {v.status === "unused" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelling(v)}
                              aria-label="Sell voucher"
                              title="Mark as sold"
                            >
                              <BadgeDollarSign className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          {v.status !== "disabled" && v.status !== "used" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatus.mutate({ id: v.id, status: "disabled", username: v.username })}
                              aria-label="Disable voucher"
                              title="Disable"
                            >
                              <Ban className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          {hasRole("admin") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToDelete(v)}
                              aria-label="Delete voucher"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {vouchers && vouchers.length >= 500 && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Showing the latest 500 vouchers. Use filters to narrow results.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateVouchersDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        packages={packages}
      />
      <SellVoucherDialog voucher={selling} onOpenChange={(o) => !o && setSelling(null)} />
      <PrintVouchersDialog
        vouchers={toPrint}
        packages={packages}
        onOpenChange={(o) => !o && setToPrint(null)}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this voucher?</AlertDialogTitle>
            <AlertDialogDescription>
              Code "{toDelete?.code}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                toDelete &&
                deleteMutation.mutate({ id: toDelete.id, username: toDelete.username })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number | undefined;
  status: VoucherStatus;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${VOUCHER_STATUS_STYLES[status]}`}
        >
          {label}
        </span>
        <p className="mt-2 font-display text-2xl font-bold">{value ?? "—"}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex min-h-[35vh] flex-col items-center justify-center p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Ticket className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold">No vouchers found</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Generate a batch of vouchers from one of your packages to get started.
      </p>
      <Button className="mt-5" onClick={onGenerate}>
        <Plus className="mr-2 h-4 w-4" /> Generate vouchers
      </Button>
    </div>
  );
}
