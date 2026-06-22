"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { businessEnquiriesPath } from "@/lib/business-paths";
import { cn } from "@/lib/utils";

export function EnquiriesTabNav({ businessId }: { businessId: string }) {
  const searchParams = useSearchParams();
  const base = businessEnquiriesPath(businessId);
  const isForms = searchParams.get("tab") === "forms";

  return (
    <nav className="mb-6 flex gap-1 border-b border-border pb-px">
      <Link
        href={base}
        className={cn(
          "inline-flex shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
          !isForms
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        Enquiries
      </Link>
      <Link
        href={businessEnquiriesPath(businessId, "forms")}
        className={cn(
          "inline-flex shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
          isForms
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        Forms
      </Link>
    </nav>
  );
}
