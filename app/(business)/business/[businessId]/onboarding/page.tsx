import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { OnboardingWizard } from "@/app/(business)/business/[businessId]/onboarding/onboarding-wizard";
import { MeisterFlowLogo } from "@/components/meisterflow-logo";
import {
  businessDashboardPath,
} from "@/lib/business-paths";
import { getBusinessForViewer } from "@/lib/business-context";
import { getOnboardingState } from "@/lib/onboarding";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const [{ businessId }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/");

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) notFound();

  if (business.config?.onboardingCompletedAt) {
    redirect(businessDashboardPath(businessId));
  }

  const state = await getOnboardingState(businessId);
  if (!state) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
        <div>
          <MeisterFlowLogo />
          <p className="mt-1 text-sm text-muted-foreground">
            Einrichtung · Schritt {state.step} von 3
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{business.name}</p>
      </div>
      <Suspense fallback={null}>
        <OnboardingWizard businessId={businessId} initialState={state} />
      </Suspense>
    </div>
  );
}
