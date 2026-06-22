import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/invoice-money";

export async function getCustomerSalesStats(
  businessId: string,
  customerId: string,
) {
  const [paidAgg, paidCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { businessId, customerId, status: "PAID" },
      _sum: { total: true },
    }),
    prisma.invoice.count({
      where: { businessId, customerId, status: "PAID" },
    }),
  ]);

  return {
    paidTotal: decimalToNumber(paidAgg._sum.total),
    paidInvoiceCount: paidCount,
  };
}
