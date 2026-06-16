import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getDashboardPath } from "@/lib/auth/redirects";

export default async function AuthRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  redirect(getDashboardPath(session.user.role));
}
