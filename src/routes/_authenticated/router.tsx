import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/router")({
  head: () => ({ meta: [{ title: "Router Monitor — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "technician"]}>
      <PageHeader title="Router Monitor" description="Health and status of the MikroTik RB951." />
      <ComingSoon note="Router health (uptime, CPU, memory, disk, hotspot & WireGuard status, active users) will stream from RouterOS via the VPS connector." />
    </RoleGuard>
  ),
});
