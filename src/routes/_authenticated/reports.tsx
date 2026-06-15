import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "cashier"]}>
      <PageHeader title="Reports" description="Sales, usage and performance analytics." />
      <ComingSoon note="Daily/weekly/monthly sales, voucher usage, cashier performance and revenue charts — exportable to PDF, Excel and CSV." />
    </RoleGuard>
  ),
});
