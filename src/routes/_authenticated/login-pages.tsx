import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon, RoleGuard } from "@/components/layout/PageParts";

export const Route = createFileRoute("/_authenticated/login-pages")({
  head: () => ({ meta: [{ title: "Login Pages — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <PageHeader title="Login Page Generator" description="Customise the captive-portal hotspot login page." />
      <ComingSoon note="Edit logo, colors, support info, package display and instructions, then generate MikroTik-compatible login.html files." />
    </RoleGuard>
  ),
});
