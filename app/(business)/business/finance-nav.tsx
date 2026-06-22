"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  Percent,
  RefreshCw,
  Settings2,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { businessFinancePath } from "@/lib/business-paths";
import { cn } from "@/lib/utils";

const FINANCE_TABS = [
  { segment: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { segment: "invoices", label: "Invoices", icon: FileText },
  { segment: "payments", label: "Payments", icon: CreditCard },
  { segment: "reminders", label: "Reminders", icon: Bell },
  { segment: "reports", label: "Reports", icon: TrendingUp },
  { segment: "payouts", label: "Payouts", icon: Wallet },
  { segment: "fees", label: "Fees", icon: Percent },
  { segment: "subscription", label: "Subscription", icon: RefreshCw },
  { segment: "settings", label: "Settings", icon: Settings2 },
] as const;

export function FinanceNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const base = businessFinancePath(businessId);

  const activeSegment =
    FINANCE_TABS.find(
      (tab) =>
        pathname === `${base}/${tab.segment}` ||
        pathname.startsWith(`${base}/${tab.segment}/`),
    )?.segment ?? "dashboard";

  return (
    <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-border pb-px">
      {FINANCE_TABS.map((tab) => {
        const href =
          tab.segment === "dashboard"
            ? `${base}/dashboard`
            : `${base}/${tab.segment}`;
        const active = activeSegment === tab.segment;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
