import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDashboardPath } from "@/lib/auth/redirects";
import { Role } from "@/lib/generated/prisma/client";

export default async function BusinessRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== Role.BUSINESS && session.user.role !== Role.ADMIN) {
    redirect(getDashboardPath(session.user.role, session.user.businessId));
  }

  return <>{children}</>;
}
