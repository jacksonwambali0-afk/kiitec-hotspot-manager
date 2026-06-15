import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff Accounts — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <PageHeader title="Staff Accounts" description="Manage administrators, cashiers and technicians." />
      <ComingSoon note="Staff management with role assignment (Administrator, Cashier, Technician) and account activation builds on the roles foundation that's already in place." />
    </RoleGuard>
  ),
});
