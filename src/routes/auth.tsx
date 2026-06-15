import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import logo from "@/assets/kiitec-logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — KIITEC Hotspot Management" },
      { name: "description", content: "Staff sign in for the KIITEC Hotspot Management System." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) return toast.error(emailResult.error.issues[0].message);
    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) return toast.error(pwResult.error.issues[0].message);

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailResult.data,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to KIITEC Hotspot!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailResult.data,
          password,
        });
        if (error) throw error;
        toast.success("Signed in successfully");
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setSubmitting(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Google sign-in failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <img src={logo} alt="KIITEC" width={48} height={48} className="h-12 w-12 rounded-lg bg-white/95 p-1.5" />
          <div>
            <p className="font-display text-lg font-bold">KIITEC Hotspot</p>
            <p className="text-sm text-primary-foreground/70">Management System</p>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-3xl font-bold leading-tight">
            Run the campus hotspot from your browser.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Generate and print vouchers, monitor live sessions, and manage the MikroTik router
            securely over WireGuard — no WinBox required.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">kiitec.ac.tz</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-10 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={logo} alt="KIITEC" width={40} height={40} className="h-10 w-10" />
            <span className="font-display text-lg font-bold">KIITEC Hotspot</span>
          </div>

          <h1 className="font-display text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to manage the KIITEC hotspot."
              : "The first account created becomes the administrator."}
          </p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value={mode} className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@kiitec.ac.tz"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={submitting}
              >
                <GoogleIcon />
                <span className="ml-2">Continue with Google</span>
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
