import { Building2 } from "lucide-react";
import Link from "next/link";

import { AddBusinessDialog } from "@/app/(admin)/admin/businesses/add-business-dialog";
import { BusinessRowActions } from "@/app/(admin)/admin/businesses/business-row-actions";
import { TablePagination } from "@/app/(admin)/admin/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { businessDashboardPath } from "@/lib/business-paths";
import { listBusinessesForAdmin } from "@/lib/businesses";
import { parsePageParam } from "@/lib/pagination";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const businesses = await listBusinessesForAdmin(parsePageParam(page));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Businesses
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage tenant accounts and their subscriptions.
          </p>
        </div>
        <AddBusinessDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {businesses.total === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Building2 className="size-8 text-muted-foreground" />
              <p className="font-medium">No businesses yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first business to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.rows.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={businessDashboardPath(business.id)}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {business.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        /{business.slug}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {business.ownerEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{business.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          business.status === "ACTIVE" ? "success" : "outline"
                        }
                      >
                        {business.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(business.createdAt)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <BusinessRowActions business={business} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {businesses.total > 0 ? (
        <TablePagination
          basePath="/admin/businesses"
          page={businesses.page}
          totalPages={businesses.totalPages}
          total={businesses.total}
        />
      ) : null}
    </div>
  );
}
