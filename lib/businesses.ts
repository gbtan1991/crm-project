import { hash } from "bcryptjs";

import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_PAGE_SIZE,
  resolvePage,
  type Paginated,
} from "@/lib/pagination";
import type {
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@/lib/validation/business";

const BCRYPT_COST = 12;

export async function getAdminDashboardStats() {
  const [
    totalBusinesses,
    totalBusinessUsers,
    activeSubscriptions,
    businessDates,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.user.count({ where: { role: Role.BUSINESS } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.business.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { createdAt: true },
    }),
  ]);

  return {
    totalBusinesses,
    totalBusinessUsers,
    activeSubscriptions,
    monthlyBusinesses: bucketByMonth(businessDates.map((b) => b.createdAt)),
  };
}

/**
 * Buckets dates into the trailing 6 calendar months (oldest first).
 */
function bucketByMonth(dates: Date[]): { month: string; count: number }[] {
  const now = new Date();
  const buckets: { key: string; label: string; count: number }[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("de-CH", { month: "short" }),
      count: 0,
    });
  }

  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const date of dates) {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const i = index.get(key);
    if (i !== undefined) buckets[i].count += 1;
  }

  return buckets.map((b) => ({ month: b.label, count: b.count }));
}

export type AdminBusinessRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  ownerUserId: string;
  ownerEmail: string;
  createdAt: string;
};

export async function listBusinessesForAdmin(
  requestedPage = 1,
  pageSize = ADMIN_PAGE_SIZE,
): Promise<Paginated<AdminBusinessRow>> {
  const total = await prisma.business.count();
  const { page, totalPages } = resolvePage(requestedPage, total, pageSize);

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      subscription: { select: { plan: true, status: true } },
      owner: { select: { id: true, email: true } },
    },
  });

  return {
    rows: businesses.map((business) => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      plan: business.subscription?.plan ?? "—",
      status: business.subscription?.status ?? "—",
      ownerUserId: business.owner.id,
      ownerEmail: business.owner.email,
      createdAt: business.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages,
  };
}

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  businessCount: number;
  businessLabel: string | null;
  createdAt: string;
};

export async function listUsersForAdmin(
  requestedPage = 1,
  pageSize = ADMIN_PAGE_SIZE,
): Promise<Paginated<AdminUserRow>> {
  const total = await prisma.user.count();
  const { page, totalPages } = resolvePage(requestedPage, total, pageSize);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      businesses: { orderBy: { createdAt: "asc" }, select: { name: true } },
    },
  });

  return {
    rows: users.map((user) => {
      const businessCount = user.businesses.length;
      const businessLabel =
        businessCount === 0
          ? null
          : businessCount === 1
            ? user.businesses[0].name
            : `${user.businesses[0].name} +${businessCount - 1} more`;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessCount,
        businessLabel,
        createdAt: user.createdAt.toISOString(),
      };
    }),
    page,
    pageSize,
    total,
    totalPages,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "business";
  let candidate = base;
  let suffix = 1;

  while (await prisma.business.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export type CreateBusinessResult =
  | { ok: true; businessId: string }
  | { ok: false; error: string };

export async function createBusiness(
  input: CreateBusinessInput,
): Promise<CreateBusinessResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.ownerEmail },
    select: { id: true },
  });
  if (existingUser) {
    return { ok: false, error: "Ein Benutzer mit dieser E-Mail existiert bereits." };
  }

  const slug = await generateUniqueSlug(input.name);
  const hashedPassword = await hash(input.ownerPassword, BCRYPT_COST);

  const business = await prisma.business.create({
    data: {
      name: input.name,
      slug,
      config: { create: {} },
      subscription: { create: {} },
      inbox: { create: {} },
      owner: {
        create: {
          name: input.ownerName,
          email: input.ownerEmail,
          password: hashedPassword,
          role: Role.BUSINESS,
        },
      },
    },
    select: { id: true },
  });

  return { ok: true, businessId: business.id };
}

export type MutateBusinessResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateBusiness(
  id: string,
  input: UpdateBusinessInput,
): Promise<MutateBusinessResult> {
  const business = await prisma.business.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!business) {
    return { ok: false, error: "Unternehmen nicht gefunden." };
  }

  const ownerId = business.ownerId;

  const emailOwner = await prisma.user.findUnique({
    where: { email: input.ownerEmail },
    select: { id: true },
  });
  if (emailOwner && emailOwner.id !== ownerId) {
    return { ok: false, error: "Ein Benutzer mit dieser E-Mail existiert bereits." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id },
      data: { name: input.name },
    });
    await tx.subscription.upsert({
      where: { businessId: id },
      update: { plan: input.plan, status: input.status },
      create: { businessId: id, plan: input.plan, status: input.status },
    });
    await tx.user.update({
      where: { id: ownerId },
      data: { email: input.ownerEmail },
    });
  });

  return { ok: true };
}

export async function deleteBusiness(
  id: string,
): Promise<MutateBusinessResult> {
  const existing = await prisma.business.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, error: "Unternehmen nicht gefunden." };
  }

  // BusinessConfig, Subscription and Users cascade via schema relations.
  await prisma.business.delete({ where: { id } });
  return { ok: true };
}

export type CreateAdminResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function createAdmin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<CreateAdminResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "Ein Benutzer mit dieser E-Mail existiert bereits." };
  }

  const hashedPassword = await hash(input.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: Role.ADMIN,
    },
    select: { id: true },
  });

  return { ok: true, userId: user.id };
}

export async function deleteUser(
  id: string,
  currentUserId: string,
): Promise<MutateBusinessResult> {
  if (id === currentUserId) {
    return { ok: false, error: "Sie können Ihr eigenes Konto nicht löschen." };
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!user) {
    return { ok: false, error: "Benutzer nicht gefunden." };
  }

  if (user.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) {
      return { ok: false, error: "Der letzte Administrator kann nicht gelöscht werden." };
    }
  }

  await prisma.user.delete({ where: { id } });
  return { ok: true };
}
