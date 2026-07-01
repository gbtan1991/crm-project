import Link from "next/link";
import {
  CalendarDays,
  FileText,
  Inbox,
  Send,
  UserPlus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BusinessActivityItem } from "@/lib/business-dashboard";
import { formatInvoiceDate } from "@/lib/invoice-display";
import { cn } from "@/lib/utils";

const ACTIVITY_ICONS = {
  customer: { icon: UserPlus, className: "bg-sky-500/10 text-sky-600" },
  booking: { icon: CalendarDays, className: "bg-violet-500/10 text-violet-600" },
  invoice: { icon: FileText, className: "bg-amber-500/10 text-amber-600" },
  invoice_paid: { icon: FileText, className: "bg-emerald-500/10 text-emerald-600" },
  invoice_sent: { icon: Send, className: "bg-primary/10 text-primary" },
  enquiry: { icon: Inbox, className: "bg-emerald-500/10 text-emerald-600" },
} as const;

export function BusinessRecentActivity({
  items,
  timeZone,
}: {
  items: BusinessActivityItem[];
  timeZone: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Letzte Aktivitäten</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aktivitäten von Kunden, Terminen, Rechnungen und Anfragen
            erscheinen hier.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const config = ACTIVITY_ICONS[item.kind];
              const Icon = config.icon;
              const content = (
                <>
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      config.className,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{item.title}</p>
                    {item.subtitle ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatInvoiceDate(item.occurredAt, timeZone)}
                    </p>
                  </div>
                </>
              );

              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="group flex items-start gap-3 rounded-lg transition-colors hover:bg-muted/50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
