import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/wireguard")({
  head: () => ({ meta: [{ title: "WireGuard — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin", "technician"]}>
      <PageHeader title="WireGuard" description="Secure tunnel between the VPS and the RB951." />
      <ComingSoon note="WireGuard configuration and tunnel status. The tunnel is always initiated from the RB951 to the VPS; the MikroTik API is never exposed publicly." />
    </RoleGuard>
  ),
});
