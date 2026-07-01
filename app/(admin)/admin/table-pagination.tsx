import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type TablePaginationProps = {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  preserveQuery?: Record<string, string | undefined>;
};

function buildPageHref(
  basePath: string,
  page: number,
  preserveQuery?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  if (preserveQuery) {
    for (const [key, value] of Object.entries(preserveQuery)) {
      if (value) params.set(key, value);
    }
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function TablePagination({
  basePath,
  page,
  totalPages,
  total,
  preserveQuery,
}: TablePaginationProps) {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-4 px-2 py-1">
      <p className="text-sm text-muted-foreground">
        Seite {page} von {totalPages} · {total} insgesamt
      </p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildPageHref(basePath, page - 1, preserveQuery)}>
              <ChevronLeft className="size-4" />
              Zurück
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="size-4" />
            Zurück
          </Button>
        )}

        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildPageHref(basePath, page + 1, preserveQuery)}>
              Weiter
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Weiter
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
