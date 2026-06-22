import { prisma } from "@/lib/prisma";

export async function getInboxForBusiness(businessId: string) {
  return prisma.inbox.findUnique({
    where: { businessId },
    select: { id: true, businessId: true },
  });
}

export async function ensureInboxForBusiness(businessId: string) {
  return prisma.inbox.upsert({
    where: { businessId },
    update: {},
    create: { businessId },
    select: { id: true, businessId: true },
  });
}
