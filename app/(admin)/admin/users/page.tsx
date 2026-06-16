import { auth } from "@/auth";
import { AddUserDialog } from "@/app/(admin)/admin/users/add-user-dialog";
import { UserRowActions } from "@/app/(admin)/admin/users/user-row-actions";
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
import { listUsersForAdmin } from "@/lib/businesses";
import { parsePageParam } from "@/lib/pagination";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ page }, session] = await Promise.all([searchParams, auth()]);
  const users = await listUsersForAdmin(parsePageParam(page));
  const currentUserId = session?.user.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Users
          </h1>
          <p className="mt-1 text-muted-foreground">
            All platform and business users.
          </p>
        </div>
        <AddUserDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Businesses</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.rows.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-6 font-medium">
                    {user.name ?? "—"}
                    {user.id === currentUserId ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (you)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.businessLabel ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <UserRowActions
                      user={user}
                      isSelf={user.id === currentUserId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TablePagination
        basePath="/admin/users"
        page={users.page}
        totalPages={users.totalPages}
        total={users.total}
      />
    </div>
  );
}
