import {
  AlertTriangle,
  Clock,
  CreditCard,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { FinanceKpiStats } from "@/lib/finance-dashboard";
import { formatMoney } from "@/lib/invoice-money";
import { cn } from "@/lib/utils";

const KPI_CONFIG = [
  {
    key: "monthlyRevenue",
    label: "Monatsumsatz",
    icon: TrendingUp,
    iconClass: "bg-emerald-500/10 text-emerald-600",
    sublabel: null,
    value: (stats: FinanceKpiStats) => stats.monthlyRevenue,
  },
  {
    key: "openInvoices",
    label: "Offene Rechnungen",
    icon: Clock,
    iconClass: "bg-sky-500/10 text-sky-600",
    sublabel: (stats: FinanceKpiStats) =>
      `${stats.openInvoices.count} Rechnung${stats.openInvoices.count === 1 ? "" : "en"}`,
    value: (stats: FinanceKpiStats) => stats.openInvoices.total,
  },
  {
    key: "overdue",
    label: "Überfällig",
    icon: AlertTriangle,
    iconClass: "bg-red-500/10 text-red-600",
    sublabel: (stats: FinanceKpiStats) =>
      `${stats.overdueInvoices.count} Rechnung${stats.overdueInvoices.count === 1 ? "" : "en"}`,
    value: (stats: FinanceKpiStats) => stats.overdueInvoices.total,
  },
  {
    key: "totalPaid",
    label: "Gesamt bezahlt",
    icon: CreditCard,
    iconClass: "bg-violet-500/10 text-violet-600",
    sublabel: null,
    value: (stats: FinanceKpiStats) => stats.totalPaid,
  },
] as const;

export function FinanceKpiCards({ stats }: { stats: FinanceKpiStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_CONFIG.map((item) => {
        const Icon = item.icon;
        const amount = item.value(stats);
        const sublabel =
          typeof item.sublabel === "function" ? item.sublabel(stats) : item.sublabel;

        return (
          <Card key={item.key}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-heading text-2xl font-bold tracking-tight">
                    {formatMoney(amount, stats.currency)}
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
