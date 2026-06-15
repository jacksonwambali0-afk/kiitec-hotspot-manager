import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({ meta: [{ title: "Packages — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <PageHeader title="Packages" description="Define hotspot plans: price, speed and validity." />
      <ComingSoon note="Package management (1 Day, 2 Days, 1 Week, 1 Month with speed and validity) will be configurable here and synced to MikroTik User Manager profiles." />
    </RoleGuard>
  ),
});
