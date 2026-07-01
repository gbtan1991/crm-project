"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Star, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewStatus } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type PublicReviewFormProps = {
  initialStatus: ReviewStatus;
  initialRating: number | null;
  initialContent: string | null;
  respondedAt: string | null;
  customerName: string;
  bookingTitle: string | null;
  bookingDate: string | null;
  googleReviewUrl: string | null;
  reviewId: string;
};

export function PublicReviewForm({
  initialStatus,
  initialRating,
  initialContent,
  respondedAt,
  customerName,
  bookingTitle,
  bookingDate,
  googleReviewUrl,
  reviewId,
}: PublicReviewFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [rating, setRating] = useState(initialRating ?? 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [content, setContent] = useState(initialContent ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopyReview() {
    const reviewText = content.trim() || initialContent?.trim();
    if (!reviewText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(reviewText);
      toast.success("Bewertung kopiert.");
    } catch {
      toast.error("Bewertung konnte nicht kopiert werden.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Bitte wählen Sie eine Bewertung aus.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/review/${reviewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, content: content.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Bewertung konnte nicht gesendet werden.");
      }

      setStatus("RECEIVED");

      if (rating >= 4 && googleReviewUrl) {
        window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "RECEIVED") {
    const displayRating = rating || initialRating || 0;
    const displayContent = content || initialContent;
    const showGoogleCta = displayRating >= 4 && Boolean(googleReviewUrl);

    return (
      <div className="space-y-6 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <Check className="size-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="mb-1 font-heading text-lg font-bold">
            Vielen Dank, {customerName}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Ihre Bewertung wurde übermittelt.
          </p>
        </div>

        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "size-8",
                star <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/20",
              )}
            />
          ))}
        </div>

        {displayContent ? (
          <p className="rounded-lg bg-muted p-4 text-sm italic text-muted-foreground">
            &ldquo;{displayContent}&rdquo;
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Bewertet am{" "}
          {respondedAt
            ? new Date(respondedAt).toLocaleDateString("de-CH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : ""}
        </p>

        {showGoogleCta ? (
          <div className="space-y-3 rounded-xl border bg-primary/5 p-4">
            <div>
              <h3 className="font-medium">Auf Google teilen?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Kopieren Sie Ihre Bewertung, öffnen Sie dann die Google-Bewertungsseite
                und fügen Sie sie dort ein.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopyReview()}
                disabled={!displayContent}
              >
                <Copy className="size-4" />
                Bewertung kopieren
              </Button>
              <Button asChild>
                <a
                  href={googleReviewUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Google-Bewertungsseite öffnen
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (status === "DECLINED") {
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-muted">
          <ThumbsUp className="size-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="mb-1 font-heading text-lg font-bold">
            Kein Problem, {customerName}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Diese Bewertungsanfrage wurde abgelehnt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {bookingTitle ? (
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">Termin</p>
          <p className="text-sm font-medium">{bookingTitle}</p>
          {bookingDate ? (
            <p className="text-xs text-muted-foreground">
              {new Date(bookingDate).toLocaleDateString("de-CH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="text-center">
        <p className="mb-2 text-sm font-medium">Bewerten Sie Ihre Erfahrung</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= (hoveredStar || rating);
            return (
              <button
                key={star}
                type="button"
                className="cursor-pointer transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setRating(star)}
                aria-label={`${star} Stern${star !== 1 ? "e" : ""}`}
              >
                <Star
                  className={cn(
                    "size-10",
                    filled
                      ? "fill-amber-400 text-amber-400"
                      : "fill-none text-muted-foreground/25",
                  )}
                />
              </button>
            );
          })}
        </div>
        {rating > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {rating === 1 && "Schlecht"}
            {rating === 2 && "Ausreichend"}
            {rating === 3 && "Gut"}
            {rating === 4 && "Sehr gut"}
            {rating === 5 && "Ausgezeichnet"}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="review-content"
          className="mb-1.5 block text-sm font-medium"
        >
          Ihre Bewertung{" "}
          <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="review-content"
          placeholder="Erzählen Sie uns von Ihrer Erfahrung..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          rows={4}
          className="resize-none"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {content.length}/1000
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Wird gesendet…
          </>
        ) : (
          "Bewertung absenden"
        )}
      </Button>
    </form>
  );
}
