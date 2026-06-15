import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, BadgeDollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { TZS } from "@/lib/voucher-utils";
import type { VoucherRow } from "./voucher-types";
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

export function SellVoucherDialog({
  voucher,
  onOpenChange,
}: {
  voucher: VoucherRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  useEffect(() => {
    if (voucher) {
      setBuyerName("");
      setBuyerPhone("");
    }
  }, [voucher]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!voucher) return;
      const { error } = await supabase
        .from("vouchers")
        .update({
          status: "sold",
          sold_at: new Date().toISOString(),
          sold_by: user?.id,
          buyer_name: buyerName.trim() || null,
          buyer_phone: buyerPhone.trim() || null,
        })
        .eq("id", voucher.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["voucher-stats"] });
      toast.success("Voucher marked as sold");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to record sale"),
  });

  return (
    <Dialog open={!!voucher} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BadgeDollarSign className="h-5 w-5 text-success" /> Sell voucher
          </DialogTitle>
          <DialogDescription>
            Record this sale. Buyer details are optional but help with support.
          </DialogDescription>
        </DialogHeader>

        {voucher && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Code</span>
                <span className="font-mono font-semibold">{voucher.code}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Package</span>
                <span>{voucher.package?.name ?? "—"}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">{TZS(voucher.price)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer name</Label>
              <Input
                id="buyer"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Buyer phone</Label>
              <Input
                id="phone"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm sale
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
