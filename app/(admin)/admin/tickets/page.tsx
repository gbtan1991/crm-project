import { redirect } from "next/navigation";

import { WebsiteTicketStatus } from "@/lib/generated/prisma/client";
import { listBusinessFilterOptionsForAdmin } from "@/lib/businesses";
import { parsePageParam } from "@/lib/pagination";
import { listWebsiteTicketsForAdmin } from "@/lib/website-tickets";
import { WEBSITE_TICKET_STATUS_OPTIONS } from "@/lib/website-ticket-display";

import { AdminTicketsPanel } from "./admin-tickets-panel";

const ALL = "ALL";

function parseStatusParam(value: string | undefined) {
  if (!value || value === ALL) {
    return undefined;
  }

  return WEBSITE_TICKET_STATUS_OPTIONS.includes(
    value as (typeof WEBSITE_TICKET_STATUS_OPTIONS)[number],
  )
    ? (value as WebsiteTicketStatus)
    : undefined;
}

function buildTicketsHref(input: {
  businessId?: string;
  status?: WebsiteTicketStatus;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.businessId) {
    params.set("businessId", input.businessId);
  }
  if (input.status) {
    params.set("status", input.status);
  }
  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }
  const query = params.toString();
  return query ? `/admin/tickets?${query}` : "/admin/tickets";
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; businessId?: string; status?: string }>;
}) {
  const { page, businessId, status } = await searchParams;
  const parsedStatus = parseStatusParam(status);
  const parsedBusinessId =
    businessId && businessId !== ALL ? businessId : undefined;
  const requestedPage = parsePageParam(page);

  const [tickets, businesses] = await Promise.all([
    listWebsiteTicketsForAdmin({
      page: requestedPage,
      businessId: parsedBusinessId,
      status: parsedStatus,
    }),
    listBusinessFilterOptionsForAdmin(),
  ]);

  if (requestedPage !== tickets.page) {
    redirect(
      buildTicketsHref({
        businessId: parsedBusinessId,
        status: parsedStatus,
        page: tickets.page,
      }),
    );
  }

  return (
    <AdminTicketsPanel
      tickets={tickets}
      businesses={businesses}
      currentBusinessId={parsedBusinessId ?? ALL}
      currentStatus={parsedStatus ?? ALL}
    />
  );
}
