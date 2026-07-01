import { prisma } from "@/lib/prisma";
import type { OnboardingPatchInput } from "@/lib/validation/onboarding";

export type OnboardingState = {
  businessId: string;
  name: string;
  step: number;
  completedAt: string | null;
  company: {
    contactPerson: string;
    businessEmail: string;
    phone: string;
    address: string;
    postalCode: string;
    city: string;
    taxId: string;
    billingAddress: string;
    logoUrl: string;
  };
  website: {
    domain: string;
    hostingAccess: string;
    hasWebsite: boolean;
    hasGoogleAnalytics: boolean;
    hasSearchConsole: boolean;
  };
  calendar: {
    provider: string | null;
    connectedAt: string | null;
    accountEmail: string | null;
    isConnected: boolean;
  };
};

function emptyString(value: string | null | undefined): string {
  return value ?? "";
}

export async function getOnboardingState(
  businessId: string,
): Promise<OnboardingState | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      config: true,
      calendarConnection: true,
    },
  });
  if (!business) return null;

  const config = business.config;
  return {
    businessId: business.id,
    name: business.name,
    step: config?.onboardingStep ?? 1,
    completedAt: config?.onboardingCompletedAt?.toISOString() ?? null,
    company: {
      contactPerson: emptyString(config?.contactPerson),
      businessEmail: emptyString(config?.businessEmail),
      phone: emptyString(config?.phone),
      address: emptyString(config?.address),
      postalCode: emptyString(config?.postalCode),
      city: emptyString(config?.city),
      taxId: emptyString(config?.taxId),
      billingAddress: emptyString(config?.billingAddress),
      logoUrl: emptyString(config?.logoUrl),
    },
    website: {
      domain: emptyString(config?.domain),
      hostingAccess: emptyString(config?.hostingAccess),
      hasWebsite: config?.hasWebsite ?? false,
      hasGoogleAnalytics: config?.hasGoogleAnalytics ?? false,
      hasSearchConsole: config?.hasSearchConsole ?? false,
    },
    calendar: {
      provider: business.calendarConnection?.provider ?? null,
      connectedAt:
        business.calendarConnection?.connectedAt?.toISOString() ?? null,
      accountEmail: business.calendarConnection?.accountEmail ?? null,
      isConnected: Boolean(
        business.calendarConnection?.connectedAt &&
          business.calendarConnection?.accessToken,
      ),
    },
  };
}

export type PatchOnboardingResult =
  | { ok: true; state: OnboardingState }
  | { ok: false; error: string };

export async function patchOnboarding(
  businessId: string,
  input: OnboardingPatchInput,
): Promise<PatchOnboardingResult> {
  const existing = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, config: { select: { id: true } } },
  });
  if (!existing) {
    return { ok: false, error: "Unternehmen nicht gefunden." };
  }

  if (input.step === 1) {
    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: businessId },
        data: { name: input.name },
      });
      await tx.businessConfig.upsert({
        where: { businessId },
        update: {
          contactPerson: input.contactPerson || null,
          businessEmail: input.businessEmail || null,
          phone: input.phone || null,
          address: input.address || null,
          postalCode: input.postalCode || null,
          city: input.city || null,
          taxId: input.taxId || null,
          billingAddress: input.billingAddress || null,
          logoUrl: input.logoUrl || null,
          onboardingStep: 2,
        },
        create: {
          businessId,
          contactPerson: input.contactPerson || null,
          businessEmail: input.businessEmail || null,
          phone: input.phone || null,
          address: input.address || null,
          postalCode: input.postalCode || null,
          city: input.city || null,
          taxId: input.taxId || null,
          billingAddress: input.billingAddress || null,
          logoUrl: input.logoUrl || null,
          onboardingStep: 2,
        },
      });
    });
  }

  if (input.step === 2) {
    await prisma.businessConfig.upsert({
      where: { businessId },
      update: {
        domain: input.domain || null,
        hostingAccess: input.hostingAccess || null,
        hasWebsite: input.hasWebsite,
        hasGoogleAnalytics: input.hasGoogleAnalytics,
        hasSearchConsole: input.hasSearchConsole,
        onboardingStep: 3,
      },
      create: {
        businessId,
        domain: input.domain || null,
        hostingAccess: input.hostingAccess || null,
        hasWebsite: input.hasWebsite,
        hasGoogleAnalytics: input.hasGoogleAnalytics,
        hasSearchConsole: input.hasSearchConsole,
        onboardingStep: 3,
      },
    });
  }

  if (input.step === 3) {
    await prisma.calendarConnection.upsert({
      where: { businessId },
      update: {
        provider: input.provider ?? null,
      },
      create: {
        businessId,
        provider: input.provider ?? null,
      },
    });

    if (input.complete) {
      await prisma.businessConfig.upsert({
        where: { businessId },
        update: {
          onboardingStep: 3,
          onboardingCompletedAt: new Date(),
        },
        create: {
          businessId,
          onboardingStep: 3,
          onboardingCompletedAt: new Date(),
        },
      });
    }
  }

  const state = await getOnboardingState(businessId);
  if (!state) {
    return { ok: false, error: "Unternehmen nicht gefunden." };
  }
  return { ok: true, state };
}
