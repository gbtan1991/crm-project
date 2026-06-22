import { CustomerStatus, CustomerSource } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function findOrCreateCustomerFromAttendee(
  businessId: string,
  attendeeEmail?: string,
  attendeeName?: string,
  options: { excludeEmails?: string[] } = {},
) {
  if (!attendeeEmail) {
    return null;
  }

  const email = attendeeEmail.trim().toLowerCase();
  if (!email) {
    return null;
  }

  const excluded = new Set(
    (options.excludeEmails ?? []).map((value) => value.trim().toLowerCase()),
  );
  if (excluded.has(email)) {
    return null;
  }

  const existing = await prisma.customer.findUnique({
    where: {
      businessId_email: { businessId, email },
    },
  });

  if (existing) {
    return existing;
  }

  const [firstName, ...rest] = (attendeeName ?? "").trim().split(/\s+/);
  const lastName = rest.join(" ") || null;

  return prisma.customer.create({
    data: {
      businessId,
      email,
      firstName: firstName || null,
      lastName,
      source: CustomerSource.CALENDAR,
      status: CustomerStatus.ACTIVE,
    },
  });
}
