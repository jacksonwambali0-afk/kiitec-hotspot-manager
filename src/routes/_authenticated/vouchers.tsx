import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "cashier"]}>
      <PageHeader title="Vouchers" description="Generate batches, sell, print and track voucher lifecycle." />
      <ComingSoon note="The voucher engine — batch generation, sold/unsold/used/expired tracking, and device binding — is the next milestone." />
    </RoleGuard>
  ),
});
