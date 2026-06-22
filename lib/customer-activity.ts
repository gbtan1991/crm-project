export type CustomerTimelineEvent = {
  id: string;
  type: "booking" | "invoice" | "inquiry" | "offer" | "review";
  title: string;
  subtitle: string | null;
  occurredAt: string;
  status: string;
  href?: string;
};

export function buildCustomerTimeline(events: {
  bookings: Array<{
    id: string;
    title: string;
    startsAt: string;
    status: string;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    title: string | null;
    issueDate: string;
    total: number;
    currency: string;
    displayStatus: string;
    href: string;
  }>;
  reviews?: Array<{
    id: string;
    status: string;
    rating: number | null;
    createdAt: string;
    bookingTitle: string | null;
  }>;
}): CustomerTimelineEvent[] {
  const timeline: CustomerTimelineEvent[] = [
    ...events.bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      type: "booking" as const,
      title: booking.title,
      subtitle: null,
      occurredAt: booking.startsAt,
      status: booking.status,
    })),
    ...events.invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: "invoice" as const,
      title: invoice.title
        ? `${invoice.number} – ${invoice.title}`
        : invoice.number,
      subtitle: new Intl.NumberFormat("de-CH", {
        style: "currency",
        currency: invoice.currency,
      }).format(invoice.total),
      occurredAt: invoice.issueDate,
      status: invoice.displayStatus,
      href: invoice.href,
    })),
    ...(events.reviews ?? []).map((review) => ({
      id: `review-${review.id}`,
      type: "review" as const,
      title: review.rating
        ? `Review: ${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`
        : "Review request sent",
      subtitle: review.bookingTitle
        ? `For ${review.bookingTitle}`
        : null,
      occurredAt: review.createdAt,
      status: review.status === "RECEIVED"
        ? "Received"
        : review.status === "DECLINED"
          ? "Declined"
          : "Requested",
    })),
  ];

  return timeline.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
