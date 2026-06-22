import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Send,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceActivityItem } from "@/lib/finance-dashboard";
import { formatInvoiceDate } from "@/lib/invoice-display";
import { cn } from "@/lib/utils";

const ACTIVITY_ICONS = {
  paid: { icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600" },
  sent: { icon: Send, className: "bg-sky-500/10 text-sky-600" },
  draft: { icon: FileText, className: "bg-muted text-muted-foreground" },
  issued: { icon: FileText, className: "bg-primary/10 text-primary" },
  overdue: { icon: AlertTriangle, className: "bg-red-500/10 text-red-600" },
} as const;

export function FinanceRecentActivity({
  items,
  timeZone,
}: {
  items: FinanceActivityItem[];
  timeZone: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Invoice activity will show up here once you create or send invoices.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const config = ACTIVITY_ICONS[item.kind];
              const Icon = config.icon;

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-3 rounded-lg transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        config.className,
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug group-hover:underline">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatInvoiceDate(item.occurredAt, timeZone)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
