import { Building2, Users, CreditCard } from "lucide-react";

import { BusinessesChart } from "@/app/(admin)/admin/dashboard/businesses-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminDashboardStats } from "@/lib/businesses";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const cards = [
    {
      label: "Total businesses",
      value: stats.totalBusinesses,
      icon: Building2,
      description: "Tenants on the platform",
    },
    {
      label: "Business users",
      value: stats.totalBusinessUsers,
      icon: Users,
      description: "Accounts across all tenants",
    },
    {
      label: "Active subscriptions",
      value: stats.activeSubscriptions,
      icon: CreditCard,
      description: "Currently active plans",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Overview of platform activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-heading text-3xl font-bold">
                  {card.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New businesses</CardTitle>
          <CardDescription>Businesses added in the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessesChart data={stats.monthlyBusinesses} />
        </CardContent>
      </Card>
    </div>
  );
}
