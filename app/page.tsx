import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";

import { auth } from "@/auth";
import { LoginForm } from "@/app/login-form";
import { getDashboardPath } from "@/lib/auth/redirects";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(getDashboardPath(session.user.role));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary">
            <LogIn className="size-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-muted-foreground">Log in to your account</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Access is managed by your administrator.
        </p>
      </div>
    </div>
  );
}
