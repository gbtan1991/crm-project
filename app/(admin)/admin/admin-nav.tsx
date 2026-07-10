"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, LogOut, Ticket } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { MeisterFlowLogo } from "@/components/meisterflow-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Unternehmen", icon: Building2 },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/users", label: "Benutzer", icon: Users },
];

export function AdminNav({ email }: { email?: string | null }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <MeisterFlowLogo />
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Administrator
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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

        <div className="flex items-center gap-3">
          {email ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {email}
            </span>
          ) : null}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              Abmelden
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
