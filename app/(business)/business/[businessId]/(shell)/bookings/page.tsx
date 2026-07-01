import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/app/(business)/business/page-header";
import { BookingsCalendarToolbar } from "@/app/(business)/business/[businessId]/(shell)/bookings/bookings-calendar-toolbar";
import { BookingsPanel } from "@/app/(business)/business/[businessId]/(shell)/bookings/bookings-panel";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import {
  computeBookingStats,
  listBookingsForBusiness,
} from "@/lib/bookings";
import { getAppointmentReminderSettings } from "@/lib/appointment-reminders";
import { listCustomerOptionsForBusiness } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function BookingsPage({ params }: PageProps) {
  const { businessId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const timeZone = business.config?.timezone ?? "UTC";

  const [bookings, calendarConnection, customers, reminderSettings] = await Promise.all([
    listBookingsForBusiness(businessId),
    prisma.calendarConnection.findUnique({
      where: { businessId },
      select: {
        connectedAt: true,
        accountEmail: true,
        provider: true,
        lastSyncedAt: true,
      },
    }),
    listCustomerOptionsForBusiness(businessId),
    getAppointmentReminderSettings(businessId),
  ]);

  const stats = computeBookingStats(bookings, timeZone);

  const isConnected = Boolean(
    calendarConnection?.connectedAt && calendarConnection.provider,
  );

  const calendarStatus = {
    isConnected,
    provider: calendarConnection?.provider ?? null,
    accountEmail: calendarConnection?.accountEmail ?? null,
    lastSyncedAt: calendarConnection?.lastSyncedAt?.toISOString() ?? null,
  };

  return (
    <div>
      <PageHeader
        title="Termine"
        subtitle="Anstehende und vergangene Termine aus Ihrem Kalender und manuellen Einträgen"
      >
        <Suspense fallback={null}>
          <BookingsCalendarToolbar
            businessId={businessId}
            initialStatus={calendarStatus}
          />
        </Suspense>
      </PageHeader>

      <BookingsPanel
        businessId={businessId}
        businessName={business.name}
        bookings={bookings}
        calendarConnected={isConnected}
        customers={customers}
        stats={stats}
        timeZone={timeZone}
        reminderSettings={reminderSettings}
      />
    </div>
  );
}
