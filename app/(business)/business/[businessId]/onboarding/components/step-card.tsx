import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function StepCard({
  title,
  subtitle,
  icon: Icon,
  children,
  onNext,
  onBack,
  onSkip,
  nextLabel = "Continue",
  nextDisabled = false,
  saving = false,
  allowSkip = false,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  saving?: boolean;
  allowSkip?: boolean;
}) {
  return (
    <Card className="shadow-lg">
      <div className="border-b border-border p-6 md:p-8">
        <div className="flex items-start gap-4">
          {Icon ? (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent">
              <Icon className="size-6 text-primary" />
            </div>
          ) : null}
          <div>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6 md:p-8">{children}</div>

      <div className="flex items-center justify-between gap-3 px-6 pb-6 md:px-8 md:pb-8">
        <div>
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              <ChevronLeft className="size-4" />
              Back
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {allowSkip && onSkip ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={onSkip}
              disabled={saving}
            >
              Skip
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || saving}
            className="min-w-[120px]"
          >
            {saving ? "Saving…" : nextLabel}
            {!saving ? <ChevronRight className="size-4" /> : null}
          </Button>
        </div>
      </div>
    </Card>
  );
}
