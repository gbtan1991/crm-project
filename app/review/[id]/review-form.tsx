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
      toast.success("Review copied.");
    } catch {
      toast.error("Failed to copy review.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
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
        throw new Error(data.error ?? "Failed to submit review.");
      }

      setStatus("RECEIVED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
            Thank you, {customerName}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Your review has been submitted.
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
          Reviewed{" "}
          {respondedAt
            ? new Date(respondedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : ""}
        </p>

        {showGoogleCta ? (
          <div className="space-y-3 rounded-xl border bg-primary/5 p-4">
            <div>
              <h3 className="font-medium">Share this on Google?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Copy your review, then open the Google review page and paste it
                there.
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
                Copy review
              </Button>
              <Button asChild>
                <a
                  href={googleReviewUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Open Google review page
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
            No problem, {customerName}!
          </h2>
          <p className="text-sm text-muted-foreground">
            This review request has been declined.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      {bookingTitle ? (
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">Booking</p>
          <p className="text-sm font-medium">{bookingTitle}</p>
          {bookingDate ? (
            <p className="text-xs text-muted-foreground">
              {new Date(bookingDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="text-center">
        <p className="mb-2 text-sm font-medium">Rate your experience</p>
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
                aria-label={`${star} star${star !== 1 ? "s" : ""}`}
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
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very good"}
            {rating === 5 && "Excellent"}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="review-content"
          className="mb-1.5 block text-sm font-medium"
        >
          Your review{" "}
          <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="review-content"
          placeholder="Tell us about your experience..."
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
            Submitting…
          </>
        ) : (
          "Submit review"
        )}
      </Button>
    </form>
  );
}
