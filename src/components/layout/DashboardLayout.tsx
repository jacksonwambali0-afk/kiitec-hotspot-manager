import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { NAV_ITEMS, NAV_GROUPS, ROLE_LABELS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logo from "@/assets/kiitec-logo.png";

function initials(name?: string | null, email?: string | null) {
  const base = name?.trim() || email?.split("@")[0] || "U";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { hasAnyRole } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => {
        const items = NAV_ITEMS.filter(
          (item) => item.group === group && hasAnyRole(item.roles),
        );
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {group}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-card"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <img src={logo} alt="KIITEC logo" width={40} height={40} className="h-10 w-10 rounded-md bg-white/95 p-1" />
      <div className="leading-tight">
        <p className="font-display text-sm font-bold text-sidebar-foreground">KIITEC Hotspot</p>
        <p className="text-[0.7rem] text-sidebar-foreground/60">Management System</p>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const primaryRole = roles[0] ? ROLE_LABELS[roles[0]] : "Staff";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        <Brand />
        <SidebarNav />
        <div className="border-t border-sidebar-border px-3 py-3 text-[0.7rem] text-sidebar-foreground/50">
          kiitec.ac.tz
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Brand />
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-display text-base font-semibold lg:text-lg">
              KIITEC Hotspot Management
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials(profile?.full_name, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-none">
                    {profile?.full_name || user?.email?.split("@")[0]}
                  </span>
                  <span className="block text-xs text-muted-foreground">{primaryRole}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-sm">{profile?.full_name || "Staff member"}</span>
                <span className="block text-xs font-normal text-muted-foreground">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
