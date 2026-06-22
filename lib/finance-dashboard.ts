import { businessInvoicePath } from "@/lib/business-paths";
import { formatCustomerName } from "@/lib/customer-display";
import { decimalToNumber } from "@/lib/invoice-money";
import { prisma } from "@/lib/prisma";

export type FinanceKpiStats = {
  currency: string;
  invoiceCount: number;
  outstandingTotal: number;
  monthlyRevenue: number;
  openInvoices: { count: number; total: number };
  overdueInvoices: { count: number; total: number };
  totalPaid: number;
};

export type FinanceRevenueMonth = {
  month: string;
  revenue: number;
};

export type FinanceActivityItem = {
  id: string;
  kind: "paid" | "sent" | "draft" | "issued" | "overdue";
  title: string;
  occurredAt: string;
  href: string;
};

export type FinanceDashboardData = FinanceKpiStats & {
  revenueByMonth: FinanceRevenueMonth[];
  recentActivity: FinanceActivityItem[];
};

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildTrailingMonths(count: number, ref = new Date()): FinanceRevenueMonth[] {
  const months: FinanceRevenueMonth[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - offset, 1),
    );
    months.push({
      month: date.toLocaleDateString("de-CH", { month: "short" }),
      revenue: 0,
    });
  }

  return months;
}

function activityForInvoice(
  businessId: string,
  invoice: {
    id: string;
    number: string;
    status: string;
    dueDate: Date;
    sentAt: Date | null;
    paidAt: Date | null;
    updatedAt: Date;
    createdAt: Date;
    customer: {
      companyName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  },
): FinanceActivityItem {
  const customerName = formatCustomerName(invoice.customer);
  const href = businessInvoicePath(businessId, invoice.id);
  const now = new Date();

  if (invoice.status === "PAID") {
    return {
      id: `paid-${invoice.id}`,
      kind: "paid",
      title: `Invoice paid – ${customerName}`,
      occurredAt: (invoice.paidAt ?? invoice.updatedAt).toISOString(),
      href,
    };
  }

  if (invoice.status === "OPEN" && invoice.dueDate < now) {
    return {
      id: `overdue-${invoice.id}`,
      kind: "overdue",
      title: `Invoice overdue – ${invoice.number}`,
      occurredAt: invoice.dueDate.toISOString(),
      href,
    };
  }

  if (invoice.sentAt) {
    return {
      id: `sent-${invoice.id}`,
      kind: "sent",
      title: `Invoice sent – ${customerName}`,
      occurredAt: invoice.sentAt.toISOString(),
      href,
    };
  }

  if (invoice.status === "DRAFT") {
    return {
      id: `draft-${invoice.id}`,
      kind: "draft",
      title: `Draft created – ${customerName}`,
      occurredAt: invoice.createdAt.toISOString(),
      href,
    };
  }

  return {
    id: `issued-${invoice.id}`,
    kind: "issued",
    title: `Invoice issued – ${customerName}`,
    occurredAt: invoice.updatedAt.toISOString(),
    href,
  };
}

export async function getFinanceDashboardData(
  businessId: string,
): Promise<FinanceDashboardData> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const revenueStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );

  const [
    invoiceCount,
    monthlyPaid,
    openInvoices,
    overdueInvoices,
    totalPaidAgg,
    paidLastYear,
    recentInvoices,
    currencyRow,
  ] = await Promise.all([
    prisma.invoice.count({ where: { businessId } }),
    prisma.invoice.aggregate({
      where: {
        businessId,
        status: "PAID",
        paidAt: { gte: monthStart },
      },
      _sum: { total: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        status: "OPEN",
        dueDate: { gte: now },
      },
      select: { total: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        status: "OPEN",
        dueDate: { lt: now },
      },
      select: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { businessId, status: "PAID" },
      _sum: { total: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        status: "PAID",
        paidAt: { gte: revenueStart },
      },
      select: { paidAt: true, total: true },
    }),
    prisma.invoice.findMany({
      where: { businessId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        id: true,
        number: true,
        status: true,
        dueDate: true,
        sentAt: true,
        paidAt: true,
        updatedAt: true,
        createdAt: true,
        customer: {
          select: {
            companyName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.invoice.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: { currency: true },
    }),
  ]);

  const currency = currencyRow?.currency ?? "CHF";

  const openTotal = openInvoices.reduce(
    (sum, invoice) => sum + decimalToNumber(invoice.total),
    0,
  );
  const overdueTotal = overdueInvoices.reduce(
    (sum, invoice) => sum + decimalToNumber(invoice.total),
    0,
  );

  const revenueByMonth = buildTrailingMonths(12, now);
  const revenueIndex = new Map(
    buildTrailingMonths(12, now).map((entry, index) => [
      monthKey(
        new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1),
        ),
      ),
      index,
    ]),
  );

  for (const invoice of paidLastYear) {
    if (!invoice.paidAt) {
      continue;
    }
    const index = revenueIndex.get(monthKey(invoice.paidAt));
    if (index != null) {
      revenueByMonth[index].revenue += decimalToNumber(invoice.total);
    }
  }

  const recentActivity = recentInvoices
    .map((invoice) => activityForInvoice(businessId, invoice))
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, 8);

  return {
    currency,
    invoiceCount,
    outstandingTotal: openTotal + overdueTotal,
    monthlyRevenue: decimalToNumber(monthlyPaid._sum.total),
    openInvoices: { count: openInvoices.length, total: openTotal },
    overdueInvoices: { count: overdueInvoices.length, total: overdueTotal },
    totalPaid: decimalToNumber(totalPaidAgg._sum.total),
    revenueByMonth,
    recentActivity,
  };
}
