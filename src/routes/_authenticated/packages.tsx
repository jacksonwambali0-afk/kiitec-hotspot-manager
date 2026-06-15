import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Package as PackageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { TZS, formatDuration, formatSpeed, formatData } from "@/lib/voucher-utils";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { PackageDialog, type PackageRow } from "@/components/packages/PackageDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({ meta: [{ title: "Packages — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <PackagesPage />
    </RoleGuard>
  ),
});

async function fetchPackages(): Promise<PackageRow[]> {
  const { data, error } = await supabase
    .from("packages")
    .select(
      "id, name, description, price, duration_minutes, speed_down_kbps, speed_up_kbps, data_limit_mb, device_limit, mikrotik_profile, is_active",
    )
    .order("price", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PackageRow[];
}

function PackagesPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [toDelete, setToDelete] = useState<PackageRow | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: fetchPackages,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package deleted");
      setToDelete(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete"),
  });

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (pkg: PackageRow) => {
    setEditing(pkg);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Packages"
        description="Define hotspot plans: price, speed, validity and device limits."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> New package
          </Button>
        }
      />

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !packages || packages.length === 0 ? (
            <EmptyState onCreate={openNew} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Speed (down/up)</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Devices</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="font-medium">{pkg.name}</div>
                        {pkg.mikrotik_profile && (
                          <div className="text-xs text-muted-foreground">
                            {pkg.mikrotik_profile}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{TZS(pkg.price)}</TableCell>
                      <TableCell>{formatDuration(pkg.duration_minutes)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatSpeed(pkg.speed_down_kbps)} / {formatSpeed(pkg.speed_up_kbps)}
                      </TableCell>
                      <TableCell className="text-sm">{formatData(pkg.data_limit_mb)}</TableCell>
                      <TableCell className="text-sm">{pkg.device_limit}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.is_active ? "default" : "secondary"}>
                          {pkg.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(pkg)}
                            aria-label="Edit package"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {hasRole("admin") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToDelete(pkg)}
                              aria-label="Delete package"
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
            </div>
          )}
        </CardContent>
      </Card>

      <PackageDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this package?</AlertDialogTitle>
            <AlertDialogDescription>
              "{toDelete?.name}" will be removed. Existing vouchers keep their settings but lose the
              package link. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <PackageIcon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold">No packages yet</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Create your first hotspot plan (e.g. 1 Day, 1 Week, 1 Month) to start generating vouchers.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" /> New package
      </Button>
    </div>
  );
}
