import { notFound } from "next/navigation";

import { PageHeader } from "@/app/(business)/business/page-header";
import { SequencesPanel } from "@/app/(business)/business/[businessId]/(shell)/sequences/sequences-panel";
import { auth } from "@/auth";
import { listSequenceActivityLogsForBusiness } from "@/lib/activity-logs";
import { getBusinessForViewer } from "@/lib/business-context";
import { listSequencesForBusiness } from "@/lib/sequences";

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ logPage?: string }>;
};

export default async function SequencesPage({ params, searchParams }: PageProps) {
  const { businessId } = await params;
  const rawSearchParams = await searchParams;
  const logPage = Math.max(Number(rawSearchParams.logPage ?? "1") || 1, 1);
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const [sequences, logs] = await Promise.all([
    listSequencesForBusiness(businessId),
    listSequenceActivityLogsForBusiness(businessId, { page: logPage, limit: 25 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Sequenzen"
        subtitle="Erstellen Sie wiederverwendbare Rechnungs-E-Mail-Sequenzen mit Verzögerungen und Variablen."
      />
      <SequencesPanel
        businessId={businessId}
        businessName={business.name}
        sequences={sequences}
        logs={logs.items}
        logPage={logPage}
        logTotalPages={logs.totalPages}
      />
    </div>
  );
}
