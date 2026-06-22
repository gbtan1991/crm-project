import { redirect } from "next/navigation";

import { businessNewInvoicePath } from "@/lib/business-paths";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function LegacyNewInvoiceRedirect({
  params,
  searchParams,
}: PageProps) {
  const { businessId } = await params;
  const query = await searchParams;
  const paramsStr = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString();
  const target = businessNewInvoicePath(businessId);
  redirect(paramsStr ? `${target}?${paramsStr}` : target);
}
