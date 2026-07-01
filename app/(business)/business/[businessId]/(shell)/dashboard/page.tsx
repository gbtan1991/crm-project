import { notFound } from "next/navigation";

import { BusinessDashboardKpiCards } from "@/app/(business)/business/[businessId]/(shell)/dashboard/business-dashboard-kpi-cards";
import { BusinessRecentActivity } from "@/app/(business)/business/[businessId]/(shell)/dashboard/business-recent-activity";
import { BusinessUpcomingBookings } from "@/app/(business)/business/[businessId]/(shell)/dashboard/business-upcoming-bookings";
import { PageHeader } from "@/app/(business)/business/page-header";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { getBusinessDashboardData } from "@/lib/business-dashboard";

type PageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function BusinessDashboardPage({ params }: PageProps) {
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
  const stats = await getBusinessDashboardData(businessId, timeZone);

  return (
    <div>
      <PageHeader
        title="Übersicht"
        subtitle={`${stats.customers} Kunden · ${stats.upcomingAppointments} anstehend · ${stats.newEnquiries} neue Anfragen`}
      />

      <div className="space-y-6">
        <BusinessDashboardKpiCards stats={stats} />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <BusinessUpcomingBookings
              businessId={businessId}
              bookings={stats.upcomingBookings}
              timeZone={timeZone}
            />
          </div>
          <BusinessRecentActivity
            items={stats.recentActivity}
            timeZone={timeZone}
          />
        </div>
      </div>
    </div>
  );
}
