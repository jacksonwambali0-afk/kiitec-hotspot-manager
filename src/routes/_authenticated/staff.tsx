import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STAFF_ROLES: Array<"cashier" | "technician"> = ["cashier", "technician"];

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Users — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <StaffPage />
    </RoleGuard>
  ),
});

function StaffPage() {
  const queryClient = useQueryClient();
  const { data: profiles = [] } = useQuery({
    queryKey: ["staff-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, is_active, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const rolesByUser = new Map<string, string[]>();
      (rolesData || []).forEach((r: any) => {
        const existing = rolesByUser.get(r.user_id) || [];
        existing.push(r.role);
        rolesByUser.set(r.user_id, existing);
      });

      return (data || []).map((profile: any) => ({
        ...profile,
        roles: rolesByUser.get(profile.id) || [],
      }));
    },
  });

  const toggleRole = useMutation({
    mutationFn: async ({
      userId,
      role,
      add,
    }: {
      userId: string;
      role: "admin" | "cashier" | "technician";
      add: boolean;
    }) => {
      if (add) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-accounts"] });
      toast.success("Staff roles updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update role"),
  });

  return (
    <div>
      <PageHeader title="Users" description="Assign cashier or technician roles to users." />

      <div className="mb-4 rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Use this page to manage staff roles. Administrators can grant or revoke cashier and technician access.
        </p>
+        <p className="mt-2 text-sm text-muted-foreground">
+          Admins are managed separately. This page controls staff role membership only.
+        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile: any) => (
              <TableRow key={profile.id}>
                <TableCell>{profile.full_name || "—"}</TableCell>
                <TableCell>{profile.email || "—"}</TableCell>
                <TableCell>
                  {(profile.roles || []).map((role: string) => (
                    <Badge key={role} className="mr-1 capitalize">
                      {role}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {STAFF_ROLES.map((role) => {
                      const hasRole = (profile.roles || []).includes(role);
                      return (
                        <Button
                          key={role}
                          size="sm"
                          variant={hasRole ? "secondary" : "outline"}
                          onClick={() => toggleRole.mutate({ userId: profile.id, role, add: !hasRole })}
                        >
                          {hasRole ? `Remove ${role}` : `Add ${role}`}
                        </Button>
                      );
                    })}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
