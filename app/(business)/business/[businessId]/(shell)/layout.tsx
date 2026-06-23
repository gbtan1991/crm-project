import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BusinessNav } from "@/app/(business)/business/business-nav";
import { OnboardingFab } from "@/app/(business)/business/onboarding-fab";
import { getBusinessForViewer } from "@/lib/business-context";
import { isOnboardingComplete } from "@/lib/business-paths";
import { prisma } from "@/lib/prisma";

export default async function BusinessShellLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}>) {
  const [{ businessId }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/");

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) redirect("/");

  const onboardingComplete = isOnboardingComplete(business.config);

  const accountUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  return (
    <>
      <BusinessNav
        businessId={business.id}
        businessName={business.name}
        name={accountUser?.name ?? session.user.name}
        email={accountUser?.email ?? session.user.email}
        role={session.user.role}
      />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <OnboardingFab businessId={business.id} show={!onboardingComplete} />
    </>
  );
}
