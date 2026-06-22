import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/generated/prisma/client";

const businessShellSelect = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  config: {
    select: {
      onboardingStep: true,
      onboardingCompletedAt: true,
      timezone: true,
      contactPerson: true,
      businessEmail: true,
      phone: true,
      address: true,
      postalCode: true,
      city: true,
      taxId: true,
      billingAddress: true,
      logoUrl: true,
      domain: true,
      hostingAccess: true,
      hasWebsite: true,
      hasGoogleAnalytics: true,
      hasSearchConsole: true,
      googleReviewUrl: true,
    },
  },
  calendarConnection: {
    select: {
      provider: true,
      connectedAt: true,
      accountEmail: true,
      accessToken: true,
    },
  },
} as const;

export type BusinessShell = NonNullable<
  Awaited<ReturnType<typeof getBusinessForOwner>>
>;

export async function getBusinessForOwner(businessId: string, ownerId: string) {
  return prisma.business.findFirst({
    where: { id: businessId, ownerId },
    select: businessShellSelect,
  });
}

export async function getBusinessForViewer(
  businessId: string,
  user: { id: string; role: Role },
) {
  return prisma.business.findFirst({
    where:
      user.role === Role.ADMIN
        ? { id: businessId }
        : { id: businessId, ownerId: user.id },
    select: businessShellSelect,
  });
}

export async function getActiveBusiness(businessId: string) {
  return prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, slug: true, ownerId: true },
  });
}
