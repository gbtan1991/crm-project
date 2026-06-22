import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bookingStatusLabel, formatBookingTime } from "@/lib/booking-display";
import { businessBookingsPath } from "@/lib/business-paths";
import type { BusinessUpcomingBooking } from "@/lib/business-dashboard";
import { Badge } from "@/components/ui/badge";

export function BusinessUpcomingBookings({
  businessId,
  bookings,
  timeZone,
}: {
  businessId: string;
  bookings: BusinessUpcomingBooking[];
  timeZone: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Upcoming appointments</CardTitle>
        <Link
          href={businessBookingsPath(businessId)}
          className="text-sm text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming appointments scheduled.
          </p>
        ) : (
          <ul className="space-y-3">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{booking.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatBookingTime(booking.startsAt, timeZone)}
                    {booking.customerName ? ` · ${booking.customerName}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {bookingStatusLabel(
                    booking.displayStatus as Parameters<typeof bookingStatusLabel>[0],
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
