import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ROLES: Array<"admin" | "cashier" | "technician"> = ["admin", "cashier", "technician"];

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "User roles — KIITEC" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <RolesPage />
    </RoleGuard>
  ),
});

function RolesPage() {
  const queryClient = useQueryClient();
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email, is_active").order("created_at", { ascending: true });
      if (error) throw error;
      // Fetch roles in separate call
      const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
      const rolesByUser = new Map<string, string[]>();
      (rolesData || []).forEach((r: any) => {
        const arr = rolesByUser.get(r.user_id) || [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      });
      return (data || []).map((p: any) => ({ ...p, roles: rolesByUser.get(p.id) || [] }));
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
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Roles updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update role"),
  });

  return (
    <div>
      <PageHeader title="User Roles" description="Manage user roles and permissions" />
      <div className="mt-4 overflow-x-auto">
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
            {profiles.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.full_name ?? "—"}</TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
                <TableCell>
                  {(p.roles || []).map((r: string) => (
                    <Badge key={r} className="mr-1 capitalize">
                      {r}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {ROLES.map((r) => {
                      const has = (p.roles || []).includes(r);
                      return (
                        <Button
                          key={r}
                          size="sm"
                          variant={has ? "secondary" : "ghost"}
                          onClick={() => toggleRole.mutate({ userId: p.id, role: r, add: !has })}
                        >
                          {has ? `Remove ${r}` : `Add ${r}`}
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

export default RolesPage;
