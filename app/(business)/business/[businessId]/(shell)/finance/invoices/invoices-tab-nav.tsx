"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { businessInvoicesPath } from "@/lib/business-paths";

export function InvoicesTabNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "templates" ? "templates" : "invoices";
  const isInvoicesSection = pathname === businessInvoicesPath(businessId);

  if (!isInvoicesSection) {
    return null;
  }

  function hrefFor(nextTab: "invoices" | "templates") {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "templates") {
      params.set("tab", "templates");
    } else {
      params.delete("tab");
      params.delete("edit");
    }
    params.delete("page");
    const query = params.toString();
    return query
      ? `${businessInvoicesPath(businessId)}?${query}`
      : businessInvoicesPath(businessId);
  }

  return (
    <Tabs value={tab} className="mb-6">
      <TabsList>
        <TabsTrigger value="invoices" asChild>
          <Link href={hrefFor("invoices")}>Rechnungen</Link>
        </TabsTrigger>
        <TabsTrigger value="templates" asChild>
          <Link href={hrefFor("templates")}>Vorlagen</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
