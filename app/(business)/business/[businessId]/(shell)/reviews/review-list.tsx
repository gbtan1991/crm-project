"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Star,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { businessReviewsPath } from "@/lib/business-paths";
import { formatCustomerName } from "@/lib/customer-display";
import type { CustomerOption } from "@/lib/customers";
import type { ReviewStatus } from "@/lib/generated/prisma/client";
import { buildReviewRequestEmailContent } from "@/lib/review-email-content";
import type { ReviewListRow } from "@/lib/reviews";
import { cn } from "@/lib/utils";

type ReviewStats = {
  total: number;
  requested: number;
  received: number;
  declined: number;
  avgRating: number | null;
  latest: ReviewListRow | null;
};

type ReviewListProps = {
  businessId: string;
  businessName: string;
  initialGoogleReviewUrl: string | null;
  customers: CustomerOption[];
  activeReviewSequence: { id: string; name: string; stepCount: number } | null;
  stats: ReviewStats;
  reviews: ReviewListRow[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentStatus: string | null;
  currentSort: "newest" | "oldest";
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  REQUESTED: "Requested",
  RECEIVED: "Received",
  DECLINED: "Declined",
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  const variantMap: Record<ReviewStatus, "outline" | "success" | "secondary"> =
    {
      REQUESTED: "outline",
      RECEIVED: "success",
      DECLINED: "secondary",
    };

  return <Badge variant={variantMap[status]}>{STATUS_LABELS[status]}</Badge>;
}

function GoogleReviewSettingsCard({
  businessId,
  initialGoogleReviewUrl,
}: {
  businessId: string;
  initialGoogleReviewUrl: string | null;
}) {
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    initialGoogleReviewUrl ?? "",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/business/${businessId}/settings/google-review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ googleReviewUrl }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save Google review link.");
      }

      setGoogleReviewUrl(data.googleReviewUrl ?? "");
      toast.success("Google review link saved.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save Google review link.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!googleReviewUrl.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(googleReviewUrl.trim());
      toast.success("Google review link copied.");
    } catch {
      toast.error("Failed to copy Google review link.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Google Business Profile</h2>
              <Badge variant={googleReviewUrl ? "default" : "outline"}>
                {googleReviewUrl ? "Configured" : "Not configured"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your Google review URL to send 4 and 5 star reviewers toward
              Google after they submit internal feedback.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!googleReviewUrl.trim()}
              onClick={() => void handleCopy()}
            >
              <Copy className="size-4" />
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!googleReviewUrl.trim()}
              asChild={Boolean(googleReviewUrl.trim())}
            >
              {googleReviewUrl.trim() ? (
                <a
                  href={googleReviewUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Open
                </a>
              ) : (
                <span>
                  <ExternalLink className="size-4" />
                  Open
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            value={googleReviewUrl}
            onChange={(event) => setGoogleReviewUrl(event.target.value)}
            placeholder="https://g.page/r/.../review"
          />
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="md:w-[120px]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const className = size === "md" ? "size-5" : "size-3.5";
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            className,
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function reviewUrl(reviewId: string) {
  if (typeof window === "undefined") {
    return `/review/${reviewId}`;
  }

  return `${window.location.origin}/review/${reviewId}`;
}

function ReviewRequestDialog({
  businessId,
  businessName,
  customers,
  activeReviewSequence,
  review,
  children,
}: {
  businessId: string;
  businessName: string;
  customers: CustomerOption[];
  activeReviewSequence: { id: string; name: string; stepCount: number } | null;
  review?: ReviewListRow;
  children: ReactNode;
}) {
  const router = useRouter();
  const isUpdate = Boolean(review);
  const defaultCustomerId = review?.customer.id ?? customers[0]?.id ?? "";
  const selectedCustomer =
    review?.customer ?? customers.find((customer) => customer.id === defaultCustomerId);
  const defaultContent = buildReviewRequestEmailContent({
    businessName,
    customerName: selectedCustomer
      ? formatCustomerName(selectedCustomer)
      : "there",
    reviewUrl: review ? reviewUrl(review.id) : "{{link}}",
    isUpdateRequest: isUpdate,
  });

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [deliveryMode, setDeliveryMode] = useState<"DIRECT" | "SEQUENCE">(
    activeReviewSequence && !isUpdate ? "SEQUENCE" : "DIRECT",
  );
  const [subject, setSubject] = useState(defaultContent.subject);
  const [bodyText, setBodyText] = useState(defaultContent.bodyText);
  const [requestReason, setRequestReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setError(null);
      setCustomerId(defaultCustomerId);
      setDeliveryMode(activeReviewSequence && !isUpdate ? "SEQUENCE" : "DIRECT");
      setSubject(defaultContent.subject);
      setBodyText(defaultContent.bodyText);
      setRequestReason("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isUpdate && !customerId) {
      setError("Select a customer.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        isUpdate
          ? `/api/business/${businessId}/reviews/${review?.id}`
          : `/api/business/${businessId}/reviews`,
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isUpdate
              ? {
                  action: "requestUpdate",
                  subject,
                  bodyText,
                  requestReason,
                }
              : {
                  customerId,
                  deliveryMode,
                  subject,
                  bodyText,
                  requestReason,
                },
          ),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send review request.");
      }

      toast.success(
        isUpdate ? "Review update request sent." : "Review request sent.",
      );
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to send review request.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isUpdate ? "Request review update" : "Request a review"}
            </DialogTitle>
            <DialogDescription>
              The customer receives an email with their private review page.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isUpdate ? (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">
                {review ? formatCustomerName(review.customer) : "Customer"}
              </p>
              <p className="text-muted-foreground">{review?.customer.email}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="review-customer">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="review-customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {formatCustomerName(customer)} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isUpdate ? (
            <div className="space-y-2">
              <Label>Delivery</Label>
              <Select
                value={deliveryMode}
                onValueChange={(value) =>
                  setDeliveryMode(value as "DIRECT" | "SEQUENCE")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">Send now</SelectItem>
                  {activeReviewSequence ? (
                    <SelectItem value="SEQUENCE">
                      Use active sequence ({activeReviewSequence.name})
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              {deliveryMode === "SEQUENCE" && activeReviewSequence ? (
                <p className="text-xs text-muted-foreground">
                  The review request will be enrolled into{" "}
                  {activeReviewSequence.name} ({activeReviewSequence.stepCount}{" "}
                  steps). Email content comes from the sequence.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="review-reason">Internal reason (optional)</Label>
            <Input
              id="review-reason"
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="e.g. Job completed, asked for updated wording"
            />
          </div>

          {deliveryMode === "DIRECT" || isUpdate ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="review-subject">Email subject</Label>
                <Input
                  id="review-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-body">Email body</Label>
                <Textarea
                  id="review-body"
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  rows={9}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{link}}"} where the public review link should appear.
                  If it is missing, the link is added automatically.
                </p>
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || customers.length === 0}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                deliveryMode === "SEQUENCE" && !isUpdate
                  ? "Start sequence"
                  : "Send request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewList({
  businessId,
  businessName,
  initialGoogleReviewUrl,
  customers,
  activeReviewSequence,
  stats,
  reviews,
  total,
  totalPages,
  currentPage,
  currentStatus,
  currentSort,
}: ReviewListProps) {
  const router = useRouter();
  const basePath = businessReviewsPath(businessId);

  function buildHref(overrides: Record<string, string | null>) {
    const params = new URLSearchParams();
    const page =
      "page" in overrides ? overrides.page : String(currentPage);
    const status = "status" in overrides ? overrides.status : currentStatus;
    const sort = "sort" in overrides ? overrides.sort : currentSort;

    if (page && page !== "1") params.set("page", page);
    if (status) params.set("status", status);
    if (sort && sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  async function handleDecline(reviewId: string) {
    const res = await fetch(
      `/api/business/${businessId}/reviews/${reviewId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      },
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to decline review.");
      return;
    }

    toast.success("Review declined.");
    router.refresh();
  }

  async function handleCopy(reviewId: string) {
    try {
      await navigator.clipboard.writeText(reviewUrl(reviewId));
      toast.success("Review link copied.");
    } catch {
      toast.error("Failed to copy review link.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ReviewRequestDialog
          businessId={businessId}
          businessName={businessName}
          customers={customers}
              activeReviewSequence={activeReviewSequence}
        >
          <Button disabled={customers.length === 0}>
            <Plus className="size-4" />
            Request a review
          </Button>
        </ReviewRequestDialog>
      </div>

      <GoogleReviewSettingsCard
        businessId={businessId}
        initialGoogleReviewUrl={initialGoogleReviewUrl}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Average rating</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="font-heading text-3xl font-bold">
                {stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
              </p>
              {stats.avgRating ? (
                <StarRating rating={Math.round(stats.avgRating)} size="md" />
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Reviews received</p>
            <p className="mt-2 font-heading text-3xl font-bold">
              {stats.received}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.requested} requested · {stats.declined} declined
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Latest review</p>
            {stats.latest ? (
              <div className="mt-2 space-y-1">
                {stats.latest.rating ? (
                  <StarRating rating={stats.latest.rating} />
                ) : null}
                <p className="line-clamp-2 text-sm">
                  {stats.latest.content || formatCustomerName(stats.latest.customer)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No reviews received yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total} review{total !== 1 ? "s" : ""} total
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={currentStatus ?? "all"}
            onValueChange={(value) => {
              router.push(
                buildHref({ status: value === "all" ? null : value, page: "1" }),
              );
            }}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="REQUESTED">Requested</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="DECLINED">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={currentSort}
            onValueChange={(value) => {
              router.push(buildHref({ sort: value, page: "1" }));
            }}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="hidden md:table-cell">Requested</TableHead>
              <TableHead className="hidden lg:table-cell">Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {currentStatus
                    ? `No ${STATUS_LABELS[currentStatus as ReviewStatus].toLowerCase()} reviews yet.`
                    : "No reviews yet. Request a review from a customer."}
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="font-medium">
                      {formatCustomerName(review.customer)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {review.customer.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={review.status} />
                  </TableCell>
                  <TableCell>
                    {review.rating ? (
                      <StarRating rating={review.rating} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {review.requestedAt
                      ? new Date(review.requestedAt).toLocaleDateString("en-US")
                      : new Date(review.createdAt).toLocaleDateString("en-US")}
                    {review.requestCount > 1 ? ` · ${review.requestCount}x` : ""}
                  </TableCell>
                  <TableCell className="hidden max-w-[240px] truncate text-xs text-muted-foreground lg:table-cell">
                    {review.requestReason || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => void handleCopy(review.id)}
                      >
                        <Copy className="size-3" />
                        Copy link
                      </Button>
                      {review.status === "REQUESTED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            void handleDecline(review.id);
                          }}
                        >
                          <ThumbsDown className="size-3" />
                          Decline
                        </Button>
                      ) : review.status === "RECEIVED" ? (
                        <ReviewRequestDialog
                          businessId={businessId}
                          businessName={businessName}
                          customers={customers}
                        activeReviewSequence={activeReviewSequence}
                          review={review}
                        >
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Request update
                          </Button>
                        </ReviewRequestDialog>
                      ) : (
                        <span className="px-2 text-xs text-muted-foreground">
                          Declined
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() =>
                router.push(buildHref({ page: String(currentPage - 1) }))
              }
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                router.push(buildHref({ page: String(currentPage + 1) }))
              }
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
