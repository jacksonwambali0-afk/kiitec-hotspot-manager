import type { VoucherStatus } from "@/lib/voucher-utils";

export interface VoucherRow {
  id: string;
  code: string;
  username: string;
  password: string;
  status: VoucherStatus;
  price: number;
  package_id: string | null;
  batch_id: string | null;
  sold_at: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  expires_at: string | null;
  bound_mac: string | null;
  comment: string | null;
  created_at: string;
  package?: { name: string; duration_minutes: number } | null;
}
