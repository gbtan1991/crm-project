import { PageHeader } from "@/app/(business)/business/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Demnächst verfügbar.
        </CardContent>
      </Card>
    </div>
  );
}
