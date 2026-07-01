"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { businessInvoicesPath } from "@/lib/business-paths";
import { invoiceStatusLabel } from "@/lib/invoice-display";

const STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "OPEN",
  "OVERDUE",
  "PAID",
  "CANCELLED",
] as const;

export function InvoicesStatusFilter({ businessId }: { businessId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "ALL";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(
      query
        ? `${businessInvoicesPath(businessId)}?${query}`
        : businessInvoicesPath(businessId),
    );
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Alle Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {status === "ALL" ? "Alle Status" : invoiceStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
