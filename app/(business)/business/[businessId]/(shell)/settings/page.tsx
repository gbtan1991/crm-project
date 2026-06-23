import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/app/(business)/business/page-header";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { resolveBusinessSettingsTab } from "@/lib/business-paths";
import { prisma } from "@/lib/prisma";

import { CalendarSettingsPanel } from "./calendar-settings-panel";
import { GeneralSettingsForm } from "./general-settings-form";
import { SettingsTabNav } from "./settings-tab-nav";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsPage({ params, searchParams }: PageProps) {
  const { businessId } = await params;
  const { tab } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const calendarConnection = await prisma.calendarConnection.findUnique({
    where: { businessId },
    select: {
      connectedAt: true,
      accountEmail: true,
      provider: true,
      lastSyncedAt: true,
      webhookChannelId: true,
      graphSubscriptionId: true,
    },
  });

  const isConnected = Boolean(
    calendarConnection?.connectedAt && calendarConnection.provider,
  );

  const calendarStatus = {
    isConnected,
    provider: calendarConnection?.provider ?? null,
    accountEmail: calendarConnection?.accountEmail ?? null,
    lastSyncedAt: calendarConnection?.lastSyncedAt?.toISOString() ?? null,
    webhookActive: Boolean(
      calendarConnection?.webhookChannelId ??
        calendarConnection?.graphSubscriptionId,
    ),
  };

  const activeTab = resolveBusinessSettingsTab(tab);

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your business configuration and calendar connection."
      />

      <Suspense fallback={null}>
        <SettingsTabNav businessId={businessId} />
      </Suspense>

      {activeTab === "general" ? (
        <GeneralSettingsForm
          businessId={businessId}
          initialName={business.name}
          initialTimezone={business.config?.timezone ?? "UTC"}
        />
      ) : (
        <CalendarSettingsPanel
          businessId={businessId}
          initialStatus={calendarStatus}
        />
      )}
    </div>
  );
}
