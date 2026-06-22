import { redirect } from "next/navigation";

import { businessInvoiceTemplatesPath } from "@/lib/business-paths";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function LegacyInvoiceTemplatesRedirect({
  params,
  searchParams,
}: PageProps) {
  const { businessId } = await params;
  const query = await searchParams;
  const edit = query.edit ? `&edit=${query.edit}` : "";
  redirect(`${businessInvoiceTemplatesPath(businessId)}${edit}`);
}
