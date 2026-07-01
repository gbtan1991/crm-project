"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Globe,
  Inbox,
  Landmark,
  LayoutDashboard,
  Star,
  Users,
  Workflow,
} from "lucide-react";

import { BusinessUserMenu } from "@/app/(business)/business/business-user-menu";
import { businessBasePath } from "@/lib/business-paths";
import { cn } from "@/lib/utils";

function tabPath(businessId: string, segment: string): string {
  return `${businessBasePath(businessId)}/${segment}`;
}

export function BusinessNav({
  businessId,
  businessName,
  name,
  email,
  role,
}: {
  businessId: string;
  businessName: string;
  name?: string | null;
  email?: string | null;
  role?: string;
}) {
  const pathname = usePathname();

  const tabs = [
    { segment: "dashboard", label: "Übersicht", icon: LayoutDashboard },
    { segment: "customers", label: "Kunden", icon: Users },
    { segment: "enquiries", label: "Anfragen", icon: Inbox },
    { segment: "bookings", label: "Termine", icon: CalendarDays },
    { segment: "finance", label: "Finanzen", icon: Landmark },
    { segment: "sequences", label: "Sequenzen", icon: Workflow },
    { segment: "reviews", label: "Bewertungen", icon: Star },
    { segment: "website", label: "Webseite", icon: Globe },
  ];

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8">
          <div className="shrink-0">
            <span className="font-heading text-lg font-bold tracking-tight">
              MeisterFlow
            </span>
            <p className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-none">
              {businessName}
            </p>
            {role === "ADMIN" ? (
              <Link
                href="/admin/dashboard"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <ArrowLeft className="size-3" />
                Zurück zum Admin
              </Link>
            ) : null}
          </div>
          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
            {tabs.map((tab) => {
              const href = tabPath(businessId, tab.segment);
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.segment}
                  href={href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0">
          <BusinessUserMenu
            businessId={businessId}
            name={name}
            email={email}
          />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 lg:hidden">
        {tabs.map((tab) => {
          const href = tabPath(businessId, tab.segment);
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
