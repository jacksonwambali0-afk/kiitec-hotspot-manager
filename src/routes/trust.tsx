import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Database,
  Server,
  Mail,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/assets/kiitec-logo.png";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Security & Privacy — KIITEC Hotspot Management" },
      {
        name: "description",
        content:
          "How the KIITEC Hotspot Management System protects staff accounts, voucher data, and network records.",
      },
      { property: "og:title", content: "Security & Privacy — KIITEC Hotspot Management" },
      {
        property: "og:description",
        content:
          "Access controls, data handling, and privacy practices for the KIITEC Hotspot Management System.",
      },
    ],
  }),
  component: TrustPage,
});

type Section = {
  icon: typeof ShieldCheck;
  title: string;
  points: string[];
};

const SECTIONS: Section[] = [
  {
    icon: KeyRound,
    title: "Access & authentication",
    points: [
      "The system is staff-only. Every page except this one requires signing in with a valid staff account.",
      "Sign-in is available with email and password, or with a Google account, through Lovable Cloud's managed authentication.",
      "Each account is assigned a role — administrator, cashier, or technician — and only sees the actions its role permits.",
    ],
  },
  {
    icon: Lock,
    title: "Data protection",
    points: [
      "Row-level security is enabled on every database table, so records are only returned to signed-in staff whose role is allowed to view them.",
      "Staff names and email addresses, and voucher codes, usernames and passwords, are never readable by the public or by signed-out visitors.",
      "Traffic between your browser and the system is encrypted in transit over HTTPS.",
    ],
  },
  {
    icon: Database,
    title: "What we store",
    points: [
      "Staff profile details (name, email, phone) used to operate the dashboard.",
      "Hotspot vouchers, packages, and the sales/usage records needed to run the service.",
      "Router status, heartbeats, and active hotspot session snapshots used for monitoring.",
    ],
  },
  {
    icon: Server,
    title: "Hosting & infrastructure",
    points: [
      "The application and database run on Lovable Cloud, a managed platform built on Supabase (managed PostgreSQL and authentication).",
      "The on-site MikroTik router connector authenticates to the backend with a secret token and runs from the operator's own machine.",
      "Privileged backend operations use server-side credentials that are never exposed to browser code.",
    ],
  },
  {
    icon: FileText,
    title: "Retention & deletion",
    points: [
      "Operational records are kept for as long as they are needed to run the hotspot service and meet KIITEC's record-keeping needs.",
      "Staff with the appropriate role can remove vouchers and related records from within the dashboard.",
    ],
  },
];

function TrustPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <img src={logo} alt="KIITEC" className="h-10 w-10 rounded" />
          <div>
            <p className="text-sm font-semibold leading-tight">KIITEC Hotspot Management</p>
            <p className="text-xs text-muted-foreground">Security &amp; Privacy</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security &amp; Privacy</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This page is maintained by KIITEC to answer common security and privacy questions about
              the KIITEC Hotspot Management System. It describes controls that are currently in place
              and is intended as editable, informational content — not an independent certification or
              audit result.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5 text-primary" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span aria-hidden className="mt-1 text-primary">
                          •
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-5 w-5 text-primary" />
                Reporting a concern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                If you believe you have found a security issue or have a privacy question, please
                contact the KIITEC administrator at{" "}
                <a className="font-medium text-primary underline" href="mailto:admin@kiitec.ac.tz">
                  admin@kiitec.ac.tz
                </a>
                .
              </p>
              <p className="text-xs">
                Responsibilities are shared: Lovable Cloud provides the managed hosting,
                authentication, and database platform, while KIITEC is responsible for how staff
                accounts, roles, and data are managed within this application.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
