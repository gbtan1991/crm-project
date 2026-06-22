import { redirect } from "next/navigation";

import { businessFinanceDashboardPath } from "@/lib/business-paths";

type PageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function FinancePage({ params }: PageProps) {
  const { businessId } = await params;
  redirect(businessFinanceDashboardPath(businessId));
}
