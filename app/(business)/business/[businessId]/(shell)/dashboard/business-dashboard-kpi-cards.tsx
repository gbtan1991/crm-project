import {
  CalendarDays,
  FileText,
  Inbox,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { BusinessKpiStats } from "@/lib/business-dashboard";
import { formatMoney } from "@/lib/invoice-money";
import { cn } from "@/lib/utils";

const KPI_CONFIG = [
  {
    key: "customers",
    label: "Kunden",
    icon: Users,
    iconClass: "bg-sky-500/10 text-sky-600",
    format: (stats: BusinessKpiStats) => String(stats.customers),
    sublabel: null,
  },
  {
    key: "upcomingAppointments",
    label: "Anstehende Termine",
    icon: CalendarDays,
    iconClass: "bg-violet-500/10 text-violet-600",
    format: (stats: BusinessKpiStats) => String(stats.upcomingAppointments),
    sublabel: (stats: BusinessKpiStats) =>
      `${stats.appointmentsToday} heute`,
  },
  {
    key: "openInvoices",
    label: "Offene Rechnungen",
    icon: FileText,
    iconClass: "bg-amber-500/10 text-amber-600",
    format: (stats: BusinessKpiStats) =>
      formatMoney(stats.openInvoices.total, stats.currency),
    sublabel: (stats: BusinessKpiStats) =>
      `${stats.openInvoices.count} Rechnung${stats.openInvoices.count === 1 ? "" : "en"}`,
  },
  {
    key: "paidInvoices",
    label: "Bezahlte Rechnungen",
    icon: FileText,
    iconClass: "bg-emerald-500/10 text-emerald-600",
    format: (stats: BusinessKpiStats) =>
      formatMoney(stats.paidInvoices.total, stats.currency),
    sublabel: (stats: BusinessKpiStats) =>
      `${stats.paidInvoices.count} Rechnung${stats.paidInvoices.count === 1 ? "" : "en"}`,
  },
  // {
  //   key: "newEnquiries",
  //   label: "New enquiries",
  //   icon: Inbox,
  //   iconClass: "bg-emerald-500/10 text-emerald-600",
  //   format: (stats: BusinessKpiStats) => String(stats.newEnquiries),
  //   sublabel: (stats: BusinessKpiStats) =>
  //     `${stats.enquiriesThisWeek} this week`,
  // },
] as const;

export function BusinessDashboardKpiCards({ stats }: { stats: BusinessKpiStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {KPI_CONFIG.map((item) => {
        const Icon = item.icon;
        const sublabel =
          typeof item.sublabel === "function" ? item.sublabel(stats) : item.sublabel;

        return (
          <Card key={item.key}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-heading text-2xl font-bold tracking-tight">
                    {item.format(stats)}
                  </p>
                  {sublabel ? (
                    <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    item.iconClass,
                  )}
                >
                  <Icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
