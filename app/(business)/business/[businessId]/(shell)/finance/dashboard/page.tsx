import { notFound } from "next/navigation";

import { FinanceKpiCards } from "@/app/(business)/business/[businessId]/(shell)/finance/dashboard/finance-kpi-cards";
import { FinanceRecentActivity } from "@/app/(business)/business/[businessId]/(shell)/finance/dashboard/finance-recent-activity";
import { FinanceRevenueChart } from "@/app/(business)/business/[businessId]/(shell)/finance/dashboard/finance-revenue-chart";
import { PageHeader } from "@/app/(business)/business/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { getBusinessForViewer } from "@/lib/business-context";
import { getFinanceDashboardData } from "@/lib/finance-dashboard";
import { formatMoney } from "@/lib/invoice-money";

type PageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function FinanceDashboardPage({ params }: PageProps) {
  const { businessId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const business = await getBusinessForViewer(businessId, session.user);
  if (!business) {
    notFound();
  }

  const stats = await getFinanceDashboardData(businessId);
  const timeZone = business.config?.timezone ?? "UTC";

  return (
    <div>
      <PageHeader
        title="Finanzen"
        subtitle={`${stats.invoiceCount} Rechnung${stats.invoiceCount === 1 ? "" : "en"} · ${formatMoney(stats.outstandingTotal, stats.currency)} offen`}
      />

      <div className="space-y-6">
        <FinanceKpiCards stats={stats} />

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Umsatz – letzte 12 Monate</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceRevenueChart
                data={stats.revenueByMonth}
                currency={stats.currency}
              />
            </CardContent>
          </Card>

          <FinanceRecentActivity
            items={stats.recentActivity}
            timeZone={timeZone}
          />
        </div>
      </div>
    </div>
  );
}
