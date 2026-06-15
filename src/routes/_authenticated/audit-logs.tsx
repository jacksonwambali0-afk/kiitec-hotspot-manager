import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <PageHeader title="Audit Logs" description="A record of every action taken in the system." />
      <ComingSoon note="Audit logging captures user, role, action, timestamp and affected resource for events like voucher generation, printing, disconnects and package edits." />
    </RoleGuard>
  ),
});
