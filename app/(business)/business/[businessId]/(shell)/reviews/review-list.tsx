"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerCombobox } from "@/components/customer-combobox";
import { DateRangePicker } from "@/components/date-range-picker";
import { EmailHtmlField } from "@/components/email-html-field";
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
import { businessReviewsPath } from "@/lib/business-paths";
import { dateRangeToYmd, ymdToDateRange } from "@/lib/date-range";
import { formatCustomerName } from "@/lib/customer-display";
import type { ReviewStatus } from "@/lib/generated/prisma/client";
import { buildReviewRequestEmailContent } from "@/lib/review-email-content";
import type { ReviewListRow } from "@/lib/reviews";
import type { ReviewStatsPeriod } from "@/lib/validation/review";
import { reviewSequencePreviewVariables } from "@/lib/email-preview";
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
  hasCustomers: boolean;
  activeReviewSequence: { id: string; name: string; stepCount: number } | null;
  stats: ReviewStats;
  reviews: ReviewListRow[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentStatus: string | null;
  currentSort: "newest" | "oldest";
  currentPeriod: ReviewStatsPeriod;
  currentFrom: string | null;
  currentTo: string | null;
};

const REVIEW_PERIOD_LABELS: Record<ReviewStatsPeriod, string> = {
  all: "Gesamter Zeitraum",
  this_month: "Dieser Monat",
  last_month: "Letzter Monat",
  last_3_months: "Letzte 3 Monate",
  last_12_months: "Letzte 12 Monate",
  custom: "Benutzerdefiniert",
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  QUEUED: "In Warteschlange",
  REQUESTED: "Angefragt",
  RECEIVED: "Erhalten",
  DECLINED: "Abgelehnt",
  FAILED: "Fehlgeschlagen",
};

function StatusBadge({
  status,
  requestCount,
}: {
  status: ReviewStatus;
  requestCount: number;
}) {
  if (status === "QUEUED") {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="size-3 animate-spin" />
        {STATUS_LABELS.QUEUED}
      </Badge>
    );
  }

  const variantMap: Record<
    Exclude<ReviewStatus, "QUEUED">,
    "outline" | "success" | "secondary" | "destructive"
  > = {
    REQUESTED: "outline",
    RECEIVED: "success",
    DECLINED: "secondary",
    FAILED: "destructive",
  };

  const label =
    status === "REQUESTED" && requestCount > 0
      ? `${STATUS_LABELS.REQUESTED} · ${requestCount} Anfrage${requestCount === 1 ? "" : "n"}`
      : STATUS_LABELS[status];

  return <Badge variant={variantMap[status]}>{label}</Badge>;
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
        throw new Error(data.error ?? "Google-Bewertungslink konnte nicht gespeichert werden.");
      }

      setGoogleReviewUrl(data.googleReviewUrl ?? "");
      toast.success("Google-Bewertungslink gespeichert.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Google-Bewertungslink konnte nicht gespeichert werden.",
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
      toast.success("Google-Bewertungslink kopiert.");
    } catch {
      toast.error("Google-Bewertungslink konnte nicht kopiert werden.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Google Unternehmensprofil</h2>
              <Badge variant={googleReviewUrl ? "default" : "outline"}>
                {googleReviewUrl ? "Konfiguriert" : "Nicht konfiguriert"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Hinterlegen Sie Ihre Google-Bewertungs-URL, um Bewerter mit 4 und 5 Sternen nach
              internem Feedback zu Google zu leiten.
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
              Kopieren
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
                  Öffnen
                </a>
              ) : (
                <span>
                  <ExternalLink className="size-4" />
                  Öffnen
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Speichern"}
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

function ReviewRatingPopover({
  rating,
  content,
}: {
  rating: number;
  content: string | null;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function handleOpen() {
    clearCloseTimer();
    setOpen(true);
  }

  function handleClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 120);
  }

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const reviewText = content?.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Bewertung anzeigen"
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          onFocus={handleOpen}
          onBlur={handleClose}
        >
          <StarRating rating={rating} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="start"
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="space-y-2">
          <StarRating rating={rating} />
          {reviewText ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">
              &ldquo;{reviewText}&rdquo;
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Kein Bewertungstext hinterlegt.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
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
  hasCustomers,
  activeReviewSequence,
  review,
  children,
}: {
  businessId: string;
  businessName: string;
  hasCustomers: boolean;
  activeReviewSequence: { id: string; name: string; stepCount: number } | null;
  review?: ReviewListRow;
  children: ReactNode;
}) {
  const router = useRouter();
  const isUpdate = Boolean(review);
  const defaultCustomerId = review?.customer.id ?? "";
  const selectedCustomer = review?.customer;
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
  const [bodyHtml, setBodyHtml] = useState(defaultContent.bodyHtml);
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
      setBodyHtml(defaultContent.bodyHtml);
      setRequestReason("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isUpdate && !customerId) {
      setError("Wählen Sie einen Kunden aus.");
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
                  bodyHtml,
                  requestReason,
                }
              : {
                  customerId,
                  deliveryMode,
                  subject,
                  bodyHtml,
                  requestReason,
                },
          ),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Bewertungsanfrage konnte nicht gesendet werden.");
      }

      if (data.warning) {
        toast.warning(
          isUpdate
            ? `Anfrage in Warteschlange: ${data.warning}`
            : `Bewertung erstellt, Versand ausstehend: ${data.warning}`,
        );
      } else {
        toast.success(
          isUpdate
            ? "Anfrage zur Bewertungsaktualisierung gesendet."
            : "Bewertungsanfrage gesendet.",
        );
      }
      setOpen(false);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Bewertungsanfrage konnte nicht gesendet werden.";
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
              {isUpdate ? "Bewertungsaktualisierung anfragen" : "Bewertung anfragen"}
            </DialogTitle>
            <DialogDescription>
              Der Kunde erhält eine E-Mail mit seiner privaten Bewertungsseite.
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
                {review ? formatCustomerName(review.customer) : "Kunde"}
              </p>
              <p className="text-muted-foreground">{review?.customer.email}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="review-customer">Kunde</Label>
              <CustomerCombobox
                id="review-customer"
                businessId={businessId}
                value={customerId}
                onValueChange={setCustomerId}
              />
            </div>
          )}

          {!isUpdate ? (
            <div className="space-y-2">
              <Label>Zustellung</Label>
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
                  <SelectItem value="DIRECT">Jetzt senden</SelectItem>
                  {activeReviewSequence ? (
                    <SelectItem value="SEQUENCE">
                      Aktive Sequenz verwenden ({activeReviewSequence.name})
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              {deliveryMode === "SEQUENCE" && activeReviewSequence ? (
                <p className="text-xs text-muted-foreground">
                  Die Bewertungsanfrage wird in {activeReviewSequence.name} (
                  {activeReviewSequence.stepCount} Schritte) eingeschrieben. Der
                  E-Mail-Inhalt stammt aus der Sequenz.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="review-reason">Interner Grund (freiwillig)</Label>
            <Input
              id="review-reason"
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="z. B. Auftrag abgeschlossen, um aktualisierten Text gebeten"
            />
          </div>

          {deliveryMode === "DIRECT" || isUpdate ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="review-subject">E-Mail-Betreff</Label>
                <Input
                  id="review-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  required
                />
              </div>

              <EmailHtmlField
                id="review-body-html"
                value={bodyHtml}
                onChange={setBodyHtml}
                sampleVariables={reviewSequencePreviewVariables(businessName)}
                resetWhenOpen={open}
                helpText={
                  <>
                    Bearbeiten Sie das HTML direkt. Verwenden Sie {"{{link}}"} für die
                    Bewertungs-URL, z. B.{" "}
                    <code className="rounded bg-muted px-1">
                      &lt;a href=&quot;{"{{link}}"}&quot;&gt;Bewertung abgeben&lt;/a&gt;
                    </code>
                  </>
                }
              />
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting || !hasCustomers}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Wird gesendet …
                </>
              ) : (
                deliveryMode === "SEQUENCE" && !isUpdate
                  ? "Sequenz starten"
                  : "Anfrage senden"
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
  hasCustomers,
  activeReviewSequence,
  stats,
  reviews,
  total,
  totalPages,
  currentPage,
  currentStatus,
  currentSort,
  currentPeriod,
  currentFrom,
  currentTo,
}: ReviewListProps) {
  const router = useRouter();
  const basePath = businessReviewsPath(businessId);
  const customDateRange = ymdToDateRange(
    currentFrom ?? undefined,
    currentTo ?? undefined,
  );
  const hasQueuedReviews = reviews.some((review) => review.status === "QUEUED");

  useEffect(() => {
    if (!hasQueuedReviews) {
      return;
    }

    const interval = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [hasQueuedReviews, router]);

  function buildHref(overrides: Record<string, string | null>) {
    const params = new URLSearchParams();
    const page =
      "page" in overrides ? overrides.page : String(currentPage);
    const status = "status" in overrides ? overrides.status : currentStatus;
    const sort = "sort" in overrides ? overrides.sort : currentSort;
    const period =
      "period" in overrides ? overrides.period : currentPeriod;
    const from = "from" in overrides ? overrides.from : currentFrom;
    const to = "to" in overrides ? overrides.to : currentTo;

    if (page && page !== "1") params.set("page", page);
    if (status) params.set("status", status);
    if (sort && sort !== "newest") params.set("sort", sort);

    if (period === "custom") {
      params.set("period", "custom");
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    } else if (period && period !== "all") {
      params.set("period", period);
    }

    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  async function handleRetry(reviewId: string) {
    try {
      const response = await fetch(
        `/api/business/${businessId}/reviews/${reviewId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "retry" }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Erneutes Senden fehlgeschlagen.");
      }

      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success("Bewertungsanfrage erneut gesendet.");
      }

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erneutes Senden fehlgeschlagen.",
      );
    }
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
      toast.error(data.error ?? "Bewertung konnte nicht abgelehnt werden.");
      return;
    }

    toast.success("Bewertung abgelehnt.");
    router.refresh();
  }

  async function handleCopy(reviewId: string) {
    try {
      await navigator.clipboard.writeText(reviewUrl(reviewId));
      toast.success("Bewertungslink kopiert.");
    } catch {
      toast.error("Bewertungslink konnte nicht kopiert werden.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ReviewRequestDialog
          businessId={businessId}
          businessName={businessName}
          hasCustomers={hasCustomers}
          activeReviewSequence={activeReviewSequence}
        >
          <Button disabled={!hasCustomers}>
            <Plus className="size-4" />
            Bewertung anfragen
          </Button>
        </ReviewRequestDialog>
      </div>

      <GoogleReviewSettingsCard
        businessId={businessId}
        initialGoogleReviewUrl={initialGoogleReviewUrl}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Analysen</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={currentPeriod}
              onValueChange={(value) => {
                router.push(
                  buildHref({
                    period: value,
                    from: value === "custom" ? currentFrom : null,
                    to: value === "custom" ? currentTo : null,
                    page: "1",
                  }),
                );
              }}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REVIEW_PERIOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              value={customDateRange}
              className="h-8 text-xs"
              placeholder="Von – Bis"
              closeOnComplete={false}
              onChange={(range) => {
                const { from, to } = dateRangeToYmd(range);
                if (!from || !to) {
                  return;
                }

                router.push(
                  buildHref({
                    period: "custom",
                    from,
                    to,
                    page: "1",
                  }),
                );
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Durchschnittsbewertung</p>
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
            <p className="text-sm text-muted-foreground">Erhaltene Bewertungen</p>
            <p className="mt-2 font-heading text-3xl font-bold">
              {stats.received}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.requested} angefragt · {stats.declined} abgelehnt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Neueste Bewertung</p>
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
                Noch keine Bewertungen erhalten.
              </p>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total} Bewertung{total !== 1 ? "en" : ""} gesamt
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
              <SelectValue placeholder="Alle Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="QUEUED">In Warteschlange</SelectItem>
              <SelectItem value="REQUESTED">Angefragt</SelectItem>
              <SelectItem value="RECEIVED">Erhalten</SelectItem>
              <SelectItem value="DECLINED">Abgelehnt</SelectItem>
              <SelectItem value="FAILED">Fehlgeschlagen</SelectItem>
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
              <SelectItem value="newest">Neueste zuerst</SelectItem>
              <SelectItem value="oldest">Älteste zuerst</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kunde</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bewertung</TableHead>
              <TableHead className="hidden md:table-cell">Angefragt</TableHead>
              <TableHead className="hidden lg:table-cell">Grund</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
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
                    ? `Noch keine ${STATUS_LABELS[currentStatus as ReviewStatus].toLowerCase()} Bewertungen.`
                    : "Noch keine Bewertungen. Fordern Sie eine Bewertung von einem Kunden an."}
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
                    <StatusBadge
                      status={review.status}
                      requestCount={review.requestCount}
                    />
                  </TableCell>
                  <TableCell>
                    {review.rating ? (
                      <ReviewRatingPopover
                        rating={review.rating}
                        content={review.content}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {review.requestedAt
                      ? new Date(review.requestedAt).toLocaleDateString("de-CH")
                      : review.status === "QUEUED"
                        ? "—"
                        : new Date(review.createdAt).toLocaleDateString("de-CH")}
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
                        Link kopieren
                      </Button>
                      {review.status === "FAILED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => void handleRetry(review.id)}
                        >
                          Erneut senden
                        </Button>
                      ) : review.status === "REQUESTED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            void handleDecline(review.id);
                          }}
                        >
                          <ThumbsDown className="size-3" />
                          Ablehnen
                        </Button>
                      ) : review.status === "RECEIVED" ? (
                        <ReviewRequestDialog
                          businessId={businessId}
                          businessName={businessName}
                          hasCustomers={hasCustomers}
                          activeReviewSequence={activeReviewSequence}
                          review={review}
                        >
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            Aktualisierung anfragen
                          </Button>
                        </ReviewRequestDialog>
                      ) : (
                        <span className="px-2 text-xs text-muted-foreground">
                          Abgelehnt
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
            Seite {currentPage} von {totalPages}
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
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                router.push(buildHref({ page: String(currentPage + 1) }))
              }
            >
              Weiter
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
