import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { businessDashboardPath } from "@/lib/business-paths";

export default async function BusinessIndexPage() {
  const session = await auth();
  const businessId = session?.user.businessId;

  if (!businessId) {
    redirect("/");
  }

  redirect(businessDashboardPath(businessId));
}
