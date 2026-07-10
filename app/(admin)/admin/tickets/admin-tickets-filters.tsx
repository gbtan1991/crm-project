"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WEBSITE_TICKET_STATUS_LABELS,
  WEBSITE_TICKET_STATUS_OPTIONS,
} from "@/lib/website-ticket-display";

const ALL = "ALL";

type BusinessOption = {
  id: string;
  name: string;
};

function buildFilterHref(businessId: string, status: string) {
  const params = new URLSearchParams();
  if (businessId !== ALL) {
    params.set("businessId", businessId);
  }
  if (status !== ALL) {
    params.set("status", status);
  }
  // Never carry `page` — filter changes always return to page 1.
  const query = params.toString();
  return query ? `/admin/tickets?${query}` : "/admin/tickets";
}

export function AdminTicketsFilters({
  businesses,
  currentBusinessId,
  currentStatus,
}: {
  businesses: BusinessOption[];
  currentBusinessId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  function updateFilters(next: { businessId?: string; status?: string }) {
    router.replace(
      buildFilterHref(
        next.businessId ?? currentBusinessId,
        next.status ?? currentStatus,
      ),
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={currentBusinessId}
        onValueChange={(value) => updateFilters({ businessId: value })}
      >
        <SelectTrigger className="w-[220px] bg-card">
          <SelectValue placeholder="Alle Unternehmen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle Unternehmen</SelectItem>
          {businesses.map((business) => (
            <SelectItem key={business.id} value={business.id}>
              {business.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentStatus}
        onValueChange={(value) => updateFilters({ status: value })}
      >
        <SelectTrigger className="w-[200px] bg-card">
          <SelectValue placeholder="Alle Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle Status</SelectItem>
          {WEBSITE_TICKET_STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {WEBSITE_TICKET_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
