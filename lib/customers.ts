import { prisma } from "@/lib/prisma";
import {
  parsePageParam,
  resolvePage,
  type Paginated,
} from "@/lib/pagination";

export { formatCustomerName, customerInitials } from "@/lib/customer-display";

export const CUSTOMER_PAGE_SIZE = 20;
export const CUSTOMER_OPTION_LIMIT = 500;

export type CustomerListRow = {
  id: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  status: string;
  source: string;
  notes: string | null;
  bookingCount: number;
  invoiceCount: number;
  createdAt: string;
};

export type CustomerOption = {
  id: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

export async function listCustomersForBusiness(
  businessId: string,
  options: { page?: number; q?: string } = {},
): Promise<Paginated<CustomerListRow>> {
  const page = options.page ?? 1;
  const q = options.q?.trim();

  const where = {
    businessId,
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { companyName: { contains: q, mode: "insensitive" as const } },
            { city: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const total = await prisma.customer.count({ where });
  const { page: resolvedPage, totalPages } = resolvePage(
    page,
    total,
    CUSTOMER_PAGE_SIZE,
  );

  const rows = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (resolvedPage - 1) * CUSTOMER_PAGE_SIZE,
    take: CUSTOMER_PAGE_SIZE,
    include: {
      _count: { select: { bookings: true, invoices: true } },
    },
  });

  return {
    page: resolvedPage,
    pageSize: CUSTOMER_PAGE_SIZE,
    total,
    totalPages,
    rows: rows.map((row) => ({
      id: row.id,
      companyName: row.companyName,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      postalCode: row.postalCode,
      status: row.status,
      source: row.source,
      notes: row.notes,
      bookingCount: row._count.bookings,
      invoiceCount: row._count.invoices,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getCustomerForBusiness(
  businessId: string,
  customerId: string,
) {
  return prisma.customer.findFirst({
    where: { id: customerId, businessId },
    include: {
      bookings: {
        orderBy: { startsAt: "desc" },
        take: 50,
      },
      _count: { select: { bookings: true, invoices: true } },
    },
  });
}

export async function listCustomerOptionsForBusiness(
  businessId: string,
): Promise<CustomerOption[]> {
  return prisma.customer.findMany({
    where: { businessId },
    orderBy: [{ companyName: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    take: CUSTOMER_OPTION_LIMIT,
    select: {
      id: true,
      companyName: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

export function parseCustomerPageParam(
  value: string | string[] | undefined,
): number {
  return parsePageParam(value);
}

export function parseCustomerSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export type CustomerDetail = NonNullable<
  Awaited<ReturnType<typeof getCustomerForBusiness>>
>;
