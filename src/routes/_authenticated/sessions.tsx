import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({ meta: [{ title: "Active Sessions — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "cashier", "technician"]}>
      <PageHeader title="Active Sessions" description="Live hotspot sessions and connected devices." />
      <ComingSoon note="Active session monitoring (IP, MAC, login time, remaining validity, data usage, disconnect) connects through the MikroTik integration over WireGuard." />
    </RoleGuard>
  ),
});
