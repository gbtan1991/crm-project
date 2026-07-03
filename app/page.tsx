import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/app/login-form";
import { MeisterFlowLogo } from "@/components/meisterflow-logo";
import { getDashboardPath } from "@/lib/auth/redirects";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(
      getDashboardPath(session.user.role, session.user.businessId),
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-6 flex justify-center">
            <MeisterFlowLogo variant="icon" className="size-16 rounded-2xl" priority />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-muted-foreground">Melden Sie sich in Ihrem Konto an</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Der Zugang wird von Ihrem Administrator verwaltet.
        </p>
      </div>
    </div>
  );
}
