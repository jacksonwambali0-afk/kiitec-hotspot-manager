import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Construction, ShieldAlert } from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ComingSoon({ note }: { note: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-card">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Construction className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold">Module in progress</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const { hasAnyRole, loading } = useAuth();
  if (loading) return null;
  if (!hasAnyRole(allow)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h3 className="font-display text-lg font-semibold">Access restricted</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Your role does not have permission to view this section. Contact an administrator if you
          believe this is a mistake.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
