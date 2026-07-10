"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Ticket } from "lucide-react";

import { AdminTicketManageDialog } from "@/app/(admin)/admin/tickets/admin-ticket-manage-dialog";
import { AdminTicketsFilters } from "@/app/(admin)/admin/tickets/admin-tickets-filters";
import { TablePagination } from "@/app/(admin)/admin/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { businessWebsitePath } from "@/lib/business-paths";
import {
  formatWebsiteTicketDate,
  WEBSITE_TICKET_PRIORITY_LABELS,
  WEBSITE_TICKET_STATUS_LABELS,
  WEBSITE_TICKET_STATUS_VARIANTS,
  WEBSITE_TICKET_TYPE_LABELS,
} from "@/lib/website-ticket-display";
import type { AdminWebsiteTicketRow } from "@/lib/website-tickets";

type BusinessOption = {
  id: string;
  name: string;
};

export function AdminTicketsPanel({
  tickets,
  businesses,
  currentBusinessId,
  currentStatus,
}: {
  tickets: {
    rows: AdminWebsiteTicketRow[];
    page: number;
    totalPages: number;
    total: number;
  };
  businesses: BusinessOption[];
  currentBusinessId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [selectedTicket, setSelectedTicket] = useState<AdminWebsiteTicketRow | null>(
    null,
  );

  function refresh() {
    router.refresh();
  }

  const preserveQuery = {
    businessId: currentBusinessId || undefined,
    status: currentStatus !== "ALL" ? currentStatus : undefined,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Tickets
          </h1>
          <p className="mt-1 text-muted-foreground">
            Website-Tickets aller Unternehmen verwalten.
          </p>
        </div>
        <AdminTicketsFilters
          businesses={businesses}
          currentBusinessId={currentBusinessId}
          currentStatus={currentStatus}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {tickets.total === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Ticket className="size-8 text-muted-foreground" />
              <p className="font-medium">Keine Tickets gefunden</p>
              <p className="text-sm text-muted-foreground">
                Passen Sie die Filter an oder warten Sie auf neue Anfragen.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Unternehmen</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Priorität</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead className="pr-6 text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.rows.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="pl-6">
                        <Link
                          href={businessWebsitePath(ticket.businessId)}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {ticket.businessName}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <p className="truncate font-medium">{ticket.title}</p>
                        {ticket.description ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {ticket.description}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {WEBSITE_TICKET_TYPE_LABELS[ticket.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.priority === "HIGH"
                              ? "destructive"
                              : ticket.priority === "MEDIUM"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {WEBSITE_TICKET_PRIORITY_LABELS[ticket.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={WEBSITE_TICKET_STATUS_VARIANTS[ticket.status]}>
                          {WEBSITE_TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatWebsiteTicketDate(ticket.createdAt)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <Pencil className="size-4" />
                          Bearbeiten
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t px-4 py-3">
                <TablePagination
                  basePath="/admin/tickets"
                  page={tickets.page}
                  totalPages={tickets.totalPages}
                  total={tickets.total}
                  preserveQuery={preserveQuery}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AdminTicketManageDialog
        ticket={selectedTicket}
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicket(null);
          }
        }}
        onSaved={refresh}
      />
    </div>
  );
}
