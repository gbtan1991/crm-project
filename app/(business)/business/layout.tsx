import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDashboardPath } from "@/lib/auth/redirects";
import { Role } from "@/lib/generated/prisma/client";

export default async function BusinessLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== Role.BUSINESS) {
    redirect(getDashboardPath(session.user.role));
  }

  if (!session.user.businessId) {
    redirect("/");
  }

  return <>{children}</>;
}
