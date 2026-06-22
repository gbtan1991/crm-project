import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BusinessNav } from "@/app/(business)/business/business-nav";
import { OnboardingFab } from "@/app/(business)/business/onboarding-fab";
import { getBusinessForViewer } from "@/lib/business-context";
import { isOnboardingComplete } from "@/lib/business-paths";

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

  return (
    <>
      <BusinessNav
        businessId={business.id}
        businessName={business.name}
        name={session.user.name}
        email={session.user.email}
        role={session.user.role}
      />
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      <OnboardingFab businessId={business.id} show={!onboardingComplete} />
    </>
  );
}
