import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <PageHeader title="Settings" description="System, MikroTik and printing configuration." />
      <ComingSoon note="Business details, MikroTik connection settings, voucher format, printing defaults and notification preferences." />
    </RoleGuard>
  ),
});
