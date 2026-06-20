import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Ticket } from "lucide-react";
import { generateVouchers } from "@/lib/vouchers.functions";
import { fetchAvailableProfiles } from "@/lib/mikrotik-client";
import { TZS } from "@/lib/voucher-utils";
import type { PackageRow } from "@/components/packages/PackageDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GenerateVouchersDialog({
  open,
  onOpenChange,
  packages,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: PackageRow[];
}) {
  const queryClient = useQueryClient();
  const generate = useServerFn(generateVouchers);
  const [packageId, setPackageId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [prefix, setPrefix] = useState("");
  const [note, setNote] = useState("");
  const [profile, setProfile] = useState("");

  const activePackages = packages.filter((p) => p.is_active);

  const { data: availableProfiles = [] } = useQuery({
    queryKey: ["mikrotik-profiles"],
    queryFn: fetchAvailableProfiles,
  });

  const selected = useMemo(
    () => packages.find((p) => p.id === packageId) ?? activePackages[0] ?? null,
    [packageId, packages, activePackages],
  );

  const defaultProfileForSelectedPackage = useMemo(() => {
    if (!selected) return "";
    return selected.mikrotik_profile?.trim() || selected.name || "";
  }, [selected]);

  useEffect(() => {
    if (open) {
      setPackageId(activePackages[0]?.id ?? "");
      setQuantity("10");
      setPrefix("");
      setNote("");
      setProfile(availableProfiles[0] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, availableProfiles]);

  useEffect(() => {
    if (selected) {
      const defaultProfile = defaultProfileForSelectedPackage;
      if (defaultProfile && availableProfiles.includes(defaultProfile)) {
        setProfile(defaultProfile);
      } else if (availableProfiles.length > 0 && !profile) {
        setProfile(availableProfiles[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, availableProfiles]);

  const mutation = useMutation({
    mutationFn: async () =>
      generate({
        data: {
          packageId,
          quantity: Number(quantity),
          prefix: prefix.trim(),
          note: note.trim(),
          profile: profile.trim(),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher-stats"] });
      toast.success(`Generated ${res.count} vouchers for ${res.packageName}`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to generate"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageId) return toast.error("Select a package");
    if (!profile) return toast.error("Select a MikroTik profile");
    const qty = Number(quantity);
    if (!qty || qty < 1 || qty > 500) return toast.error("Quantity must be between 1 and 500");
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Generate vouchers
          </DialogTitle>
          <DialogDescription>
            Create a batch of unique voucher codes for a package.
          </DialogDescription>
        </DialogHeader>

        {activePackages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No active packages available. Create a package first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pkg">Package</Label>
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger id="pkg">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {activePackages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {TZS(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  max="500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix">Code prefix</Label>
                <Input
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="Optional"
                  maxLength={8}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile">MikroTik profile</Label>
                <Select value={profile} onValueChange={setProfile}>
                  <SelectTrigger id="profile">
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.length > 0 ? (
                      availableProfiles.map((profileName) => (
                        <SelectItem key={profileName} value={profileName}>
                          {profileName}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="">No profiles available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Batch note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional — e.g. for reseller, event, etc."
                  rows={2}
                />
              </div>
            </div>

            {selected && (
              <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                Total batch value:{" "}
                <span className="font-medium text-foreground">
                  {TZS((Number(selected.price) || 0) * (Number(quantity) || 0))}
                </span>
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
