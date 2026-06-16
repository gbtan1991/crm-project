import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminNav } from "@/app/(admin)/admin/admin-nav";
import { getDashboardPath } from "@/lib/auth/redirects";
import { Role } from "@/lib/generated/prisma/client";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect(getDashboardPath(session.user.role));
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav email={session.user.email} />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
