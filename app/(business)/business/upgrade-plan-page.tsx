import { LockKeyhole } from "lucide-react";

import { PageHeader } from "@/app/(business)/business/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function UpgradePlanPage({
  title,
  subtitle,
  feature,
}: {
  title: string;
  subtitle: string;
  feature: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LockKeyhole className="size-6" />
          </div>
          <Badge variant="secondary">Pro plan</Badge>
          <div className="space-y-2">
            <h2 className="font-heading text-xl font-bold">
              Upgrade to Pro to unlock {feature}
            </h2>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              This section is available on the Pro plan. Your current Basic plan
              keeps core CRM, appointments, enquiries, and invoicing available.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
