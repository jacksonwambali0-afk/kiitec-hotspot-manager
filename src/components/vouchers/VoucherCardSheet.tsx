import logo from "@/assets/kiitec-logo.png";
import { TZS, formatDuration, formatSpeed, formatData } from "@/lib/voucher-utils";
import type { VoucherRow } from "@/components/vouchers/voucher-types";
import type { PackageRow } from "@/components/packages/PackageDialog";

export interface VoucherCardItem {
  voucher: VoucherRow;
  pkg?: PackageRow;
}

/** A single printable voucher card. */
function VoucherCard({ voucher, pkg }: VoucherCardItem) {
  const name = pkg?.name ?? voucher.package?.name ?? "Hotspot Access";
  const minutes = pkg?.duration_minutes ?? voucher.package?.duration_minutes ?? 0;

  return (
    <div className="voucher-card print-exact flex flex-col overflow-hidden rounded-lg border border-primary/30 bg-card">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-2 bg-primary px-3 py-2 text-primary-foreground">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-6 w-6 rounded bg-white/95 p-0.5" />
          <span className="font-display text-xs font-bold leading-tight">
            KIITEC Hotspot
          </span>
        </div>
        <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-primary">
          {TZS(voucher.price)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-center text-xs font-semibold text-muted-foreground">{name}</p>

        {/* Code */}
        <div className="rounded-md border border-dashed border-primary/40 bg-muted/40 px-2 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Voucher code</p>
          <p className="font-mono text-lg font-bold tracking-[0.15em] text-foreground">
            {voucher.code}
          </p>
        </div>

        {/* Details */}
        <div className="grid grid-cols-3 gap-1 text-center text-[9px]">
          <div>
            <p className="font-semibold text-foreground">{formatDuration(minutes)}</p>
            <p className="text-muted-foreground">Validity</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{formatSpeed(pkg?.speed_down_kbps)}</p>
            <p className="text-muted-foreground">Speed</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">{formatData(pkg?.data_limit_mb)}</p>
            <p className="text-muted-foreground">Data</p>
          </div>
        </div>

        <p className="mt-auto text-center text-[8px] leading-snug text-muted-foreground">
          Connect to the <span className="font-semibold">KIITEC</span> Wi-Fi, open the login page and
          enter this code. · kiitec.ac.tz
        </p>
      </div>
    </div>
  );
}

/** Grid of printable voucher cards (used for both on-screen preview and print). */
export function VoucherCardSheet({ items }: { items: VoucherCardItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(({ voucher, pkg }) => (
        <VoucherCard key={voucher.id} voucher={voucher} pkg={pkg} />
      ))}
    </div>
  );
}
