import { notFound } from "next/navigation";

import { getReviewById } from "@/lib/reviews";

import { PublicReviewForm } from "./review-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params;
  const review = await getReviewById(id);

  if (!review) {
    notFound();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl leading-none">
                {review.business.name.charAt(0)}
              </span>
            </div>
            <h1 className="mb-1 font-heading text-xl font-bold tracking-tight">
              {review.business.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              We&apos;d love your feedback
            </p>
          </div>

          <PublicReviewForm
            initialStatus={review.status}
            initialRating={review.rating}
            initialContent={review.content}
            respondedAt={review.respondedAt?.toISOString() ?? null}
            customerName={
              [review.customer.firstName, review.customer.lastName]
                .filter(Boolean)
                .join(" ") || review.customer.email
            }
            bookingTitle={review.booking?.title ?? null}
            bookingDate={review.booking?.startsAt?.toISOString() ?? null}
            googleReviewUrl={review.business.config?.googleReviewUrl ?? null}
            reviewId={id}
          />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Powered by MeisterFlow
        </p>
      </div>
    </div>
  );
}
