import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, RoleGuard } from "@/components/layout/PageParts";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/diagnostics")({
  head: () => ({ meta: [{ title: "Diagnostics — KIITEC Hotspot Management" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <DiagnosticsPage />
    </RoleGuard>
  ),
});

interface TestResult {
  name: string;
  status: "pending" | "success" | "error";
  message?: string;
  data?: unknown;
}

function DiagnosticsPage() {
  const { user, profile, roles, loading } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setTests([]);
    setRunning(true);

    const newTests: TestResult[] = [];

    // Test 1: Check user session
    newTests.push({
      name: "User Session",
      status: user ? "success" : "error",
      message: user ? `Logged in as: ${user.email}` : "No user session",
      data: user?.id,
    });

    // Test 2: Check profile
    newTests.push({
      name: "Profile Loaded",
      status: profile ? "success" : "error",
      message: profile
        ? `Profile: ${profile.full_name || "No name"}`
        : "Profile not loaded",
      data: profile,
    });

    // Test 3: Check roles
    newTests.push({
      name: "Roles Loaded",
      status: roles.length > 0 ? "success" : "error",
      message:
        roles.length > 0
          ? `Roles: ${roles.join(", ")}`
          : "No roles found",
      data: roles,
    });

    setTests([...newTests]);

    // Test 4: Query packages
    try {
      const { data, error, count } = await supabase
        .from("packages")
        .select("*", { count: "exact" });
      newTests.push({
        name: "Packages Query",
        status: error ? "error" : "success",
        message: error
          ? `Error: ${error.message}`
          : `Found ${data?.length ?? 0} packages`,
        data: { count, first: data?.[0] },
      });
    } catch (err) {
      newTests.push({
        name: "Packages Query",
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Test 5: Query vouchers
    try {
      const { data, error, count } = await supabase
        .from("vouchers")
        .select("*", { count: "exact" })
        .limit(1);
      newTests.push({
        name: "Vouchers Query",
        status: error ? "error" : "success",
        message: error
          ? `Error: ${error.message}`
          : `Found ${count ?? 0} total vouchers`,
        data: { count, first: data?.[0] },
      });
    } catch (err) {
      newTests.push({
        name: "Vouchers Query",
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Test 6: Check user_roles table
    try {
      if (user) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("*")
          .eq("user_id", user.id);
        newTests.push({
          name: "User Roles in DB",
          status: error ? "error" : "success",
          message: error
            ? `Error: ${error.message}`
            : `Found ${data?.length ?? 0} role(s) in database`,
          data: data,
        });
      }
    } catch (err) {
      newTests.push({
        name: "User Roles in DB",
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Test 7: Check has_role function
    try {
      if (user) {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        newTests.push({
          name: "has_role() function",
          status: error ? "error" : "success",
          message: error
            ? `Error: ${error.message}`
            : `Admin check result: ${data}`,
          data: data,
        });
      }
    } catch (err) {
      newTests.push({
        name: "has_role() function",
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Test 8: Raw package count (no filtering)
    try {
      const { data, error, count } = await supabase
        .from("packages")
        .select("*", { count: "exact" });
      newTests.push({
        name: "Raw Packages Count",
        status: error ? "error" : "success",
        message: error
          ? `Error: ${error.message}`
          : `Total packages in database: ${count}`,
        data: data?.slice(0, 3),
      });
    } catch (err) {
      newTests.push({
        name: "Raw Packages Count",
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Test 9: Raw voucher count (no filtering)
    try {
      const { data, error, count } = await supabase
        .from("vouchers")
        .select("*", { count: "exact" })
        .limit(3);
      newTests.push({
        name: "Raw Vouchers Count",
        status: error ? "error" : "success",
        message: error
          ? `Error: ${error.message}`
          : `Total vouchers in database: ${count}`,
        data: data?.slice(0, 3),
      });
    } catch (err) {
      newTests.push({
        name: "Raw Vouchers Count",
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Test 10: Hotspot sessions (should work since you see them)
    try {
      const { data, error, count } = await supabase
        .from("hotspot_sessions")
        .select("*", { count: "exact" })
        .limit(3);
      newTests.push({
        name: "Hotspot Sessions",
        status: error ? "error" : "success",
        message: error
          ? `Error: ${error.message}`
          : `Total sessions: ${count}`,
        data: { count },
      });
    } catch (err) {
      newTests.push({
        name: "Hotspot Sessions",
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }

    setTests(newTests);
    setRunning(false);
  };

  return (
    <>
      <PageHeader
        title="Diagnostics"
        description="Debug authentication, permissions, and data access issues."
      />

      <div className="space-y-4">
        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-mono text-sm">{user?.email || "Not logged in"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-sm text-xs break-all">
                {user?.id || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-mono text-sm">
                {profile?.full_name || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roles</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {loading ? (
                  <Badge variant="secondary">Loading...</Badge>
                ) : roles.length === 0 ? (
                  <Badge variant="destructive">No roles assigned</Badge>
                ) : (
                  roles.map((role) => (
                    <Badge key={role} variant="default">
                      {role}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Test Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={runDiagnostics} disabled={running || loading}>
              {running ? "Running tests..." : "Run Diagnostics"}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        {tests.length > 0 && (
          <div className="space-y-2">
            {tests.map((test) => (
              <Card key={test.name}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {test.status === "success" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    {test.status === "error" && (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    {test.status === "pending" && (
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{test.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {test.message}
                      </p>
                      {!!test.data && (
                        <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-auto max-h-40">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Important Notes */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              <li>Make sure your user_roles table has entries for this user</li>
              <li>Check that the has_role() function exists in Supabase</li>
              <li>Verify RLS policies allow your role to SELECT from tables</li>
              <li>Browser console (F12) may show additional error details</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
