"use client";

import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { businessEnquiriesPath } from "@/lib/business-paths";
import {
  ENQUIRY_STATUS_OPTIONS,
  enquiryStatusLabel,
} from "@/lib/enquiry-display";

const ALL_STATUSES = "ALL";

export function EnquiriesStatusFilter({
  businessId,
  current,
}: {
  businessId: string;
  current: string;
}) {
  const router = useRouter();

  function handleChange(value: string) {
    const base = businessEnquiriesPath(businessId);
    router.push(value === ALL_STATUSES ? base : `${base}?status=${value}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[160px] bg-card">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
        {ENQUIRY_STATUS_OPTIONS.map((status) => (
          <SelectItem key={status} value={status}>
            {enquiryStatusLabel(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
