import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VoucherRow } from "@/components/vouchers/voucher-types";
import type { PackageRow } from "@/components/packages/PackageDialog";
import { VoucherCardSheet, type VoucherCardItem } from "@/components/vouchers/VoucherCardSheet";

export function PrintVouchersDialog({
  vouchers,
  packages,
  onOpenChange,
}: {
  vouchers: VoucherRow[] | null;
  packages: PackageRow[];
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!vouchers && vouchers.length > 0;

  const items = useMemo<VoucherCardItem[]>(() => {
    if (!vouchers) return [];
    const byId = new Map(packages.map((p) => [p.id, p]));
    return vouchers.map((voucher) => ({
      voucher,
      pkg: voucher.package_id ? byId.get(voucher.package_id) : undefined,
    }));
  }, [vouchers, packages]);

  const handlePrint = () => window.print();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Print voucher cards</DialogTitle>
            <DialogDescription>
              {items.length} card{items.length === 1 ? "" : "s"} ready. Preview below, then print or
              save as PDF from your browser's print dialog.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto rounded-lg bg-muted/30 p-4">
            <VoucherCardSheet items={items} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden body-level print root — only this reaches the paper. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div id="voucher-print-root">
            <VoucherCardSheet items={items} />
          </div>,
          document.body,
        )}
    </>
  );
}
