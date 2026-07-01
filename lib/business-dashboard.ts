import {
  businessBookingsPath,
  businessCustomerPath,
  businessEnquiriesPath,
  businessInvoicePath,
} from "@/lib/business-paths";
import { effectiveBookingStatus } from "@/lib/booking-display";
import { computeBookingStats } from "@/lib/bookings";
import { decimalToNumber } from "@/lib/invoice-money";
import { prisma } from "@/lib/prisma";

export type BusinessKpiStats = {
  customers: number;
  upcomingAppointments: number;
  appointmentsToday: number;
  openInvoices: { count: number; total: number };
  paidInvoices: { count: number; total: number };
  newEnquiries: number;
  enquiriesThisWeek: number;
  currency: string;
};

export type BusinessActivityItem = {
  id: string;
  kind:
    | "customer"
    | "booking"
    | "invoice"
    | "enquiry"
    | "invoice_paid"
    | "invoice_sent";
  title: string;
  subtitle: string | null;
  occurredAt: string;
  href?: string;
};

export type BusinessUpcomingBooking = {
  id: string;
  title: string;
  startsAt: string;
  displayStatus: string;
  customerName: string | null;
};

export type BusinessDashboardData = BusinessKpiStats & {
  recentActivity: BusinessActivityItem[];
  upcomingBookings: BusinessUpcomingBooking[];
};

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - day);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export async function getBusinessDashboardData(
  businessId: string,
  timeZone: string,
): Promise<BusinessDashboardData> {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [
    customers,
    bookings,
    openInvoiceAgg,
    openInvoiceCount,
    paidInvoiceAgg,
    paidInvoiceCount,
    newEnquiries,
    enquiriesThisWeek,
    recentCustomers,
    recentBookings,
    recentInvoices,
    recentEnquiries,
    currencyRow,
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId } }),
    prisma.booking.findMany({
      where: {
        businessId,
        status: { notIn: ["CANCELLED"] },
      },
      orderBy: { startsAt: "desc" },
      take: 100,
      include: {
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
    prisma.invoice.aggregate({
      where: { businessId, status: "OPEN" },
      _sum: { total: true },
    }),
    prisma.invoice.count({ where: { businessId, status: "OPEN" } }),
    prisma.invoice.aggregate({
      where: { businessId, status: "PAID" },
      _sum: { total: true },
    }),
    prisma.invoice.count({ where: { businessId, status: "PAID" } }),
    prisma.enquiry.count({ where: { businessId, status: "NEW" } }),
    prisma.enquiry.count({
      where: {
        businessId,
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        companyName: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.booking.findMany({
      where: { businessId, status: { not: "CANCELLED" } },
      orderBy: { startsAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        status: true,
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
    prisma.invoice.findMany({
      where: { businessId },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        number: true,
        status: true,
        sentAt: true,
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
    prisma.enquiry.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { form: { select: { name: true } } },
    }),
    prisma.invoice.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: { currency: true },
    }),
  ]);

  const bookingStats = computeBookingStats(
    bookings.map((booking) => ({ startsAt: booking.startsAt.toISOString() })),
    timeZone,
  );

  const upcomingAppointments = bookings.filter((booking) => {
    const displayStatus = effectiveBookingStatus(
      booking.status,
      booking.endsAt,
      now,
    );
    return (
      booking.startsAt >= now &&
      displayStatus !== "COMPLETED" &&
      displayStatus !== "OVERDUE"
    );
  }).length;

  const upcomingBookings = bookings
    .filter((booking) => booking.startsAt >= now)
    .sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    )
    .slice(0, 5)
    .map((booking) => {
      const customerName = booking.customer
        ? booking.customer.companyName ||
          [booking.customer.firstName, booking.customer.lastName]
            .filter(Boolean)
            .join(" ") ||
          booking.customer.email
        : null;

      return {
        id: booking.id,
        title: booking.title,
        startsAt: booking.startsAt.toISOString(),
        displayStatus: effectiveBookingStatus(
          booking.status,
          booking.endsAt,
          now,
        ),
        customerName,
      };
    });

  const activity: BusinessActivityItem[] = [
    ...recentCustomers.map((customer) => ({
      id: `customer-${customer.id}`,
      kind: "customer" as const,
      title: `Neuer Kunde — ${
        customer.companyName ||
        [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
        customer.email
      }`,
      subtitle: null,
      occurredAt: customer.createdAt.toISOString(),
      href: businessCustomerPath(businessId, customer.id),
    })),
    ...recentBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      kind: "booking" as const,
      title: `Termin — ${booking.title}`,
      subtitle: booking.customer
        ? booking.customer.companyName ||
          [booking.customer.firstName, booking.customer.lastName]
            .filter(Boolean)
            .join(" ") ||
          booking.customer.email
        : null,
      occurredAt: booking.startsAt.toISOString(),
      href: businessBookingsPath(businessId),
    })),
    ...recentInvoices.map((invoice) => {
      const customerName =
        invoice.customer.companyName ||
        [invoice.customer.firstName, invoice.customer.lastName]
          .filter(Boolean)
          .join(" ") ||
        invoice.customer.email;

      if (invoice.status === "PAID") {
        return {
          id: `invoice-paid-${invoice.id}`,
          kind: "invoice_paid" as const,
          title: `Rechnung bezahlt — ${invoice.number}`,
          subtitle: customerName,
          occurredAt: invoice.updatedAt.toISOString(),
          href: businessInvoicePath(businessId, invoice.id),
        };
      }

      if (invoice.sentAt) {
        return {
          id: `invoice-sent-${invoice.id}`,
          kind: "invoice_sent" as const,
          title: `Rechnung versendet — ${invoice.number}`,
          subtitle: customerName,
          occurredAt: invoice.sentAt.toISOString(),
          href: businessInvoicePath(businessId, invoice.id),
        };
      }

      return {
        id: `invoice-${invoice.id}`,
        kind: "invoice" as const,
        title: `Rechnung — ${invoice.number}`,
        subtitle: customerName,
        occurredAt: invoice.updatedAt.toISOString(),
        href: businessInvoicePath(businessId, invoice.id),
      };
    }),
    ...recentEnquiries.map((enquiry) => {
      const data =
        enquiry.data && typeof enquiry.data === "object" && !Array.isArray(enquiry.data)
          ? (enquiry.data as Record<string, unknown>)
          : {};

      const name =
        typeof data.name === "string"
          ? data.name
          : typeof data.email === "string"
            ? data.email
            : "Neue Anfrage";

      return {
        id: `enquiry-${enquiry.id}`,
        kind: "enquiry" as const,
        title: `Anfrage — ${name}`,
        subtitle: enquiry.form.name,
        occurredAt: enquiry.createdAt.toISOString(),
        href: businessEnquiriesPath(businessId),
      };
    }),
  ]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, 10);

  return {
    customers,
    upcomingAppointments,
    appointmentsToday: bookingStats.today,
    openInvoices: {
      count: openInvoiceCount,
      total: decimalToNumber(openInvoiceAgg._sum.total),
    },
    paidInvoices: {
      count: paidInvoiceCount,
      total: decimalToNumber(paidInvoiceAgg._sum.total),
    },
    newEnquiries,
    enquiriesThisWeek,
    currency: currencyRow?.currency ?? "CHF",
    recentActivity: activity,
    upcomingBookings,
  };
}
