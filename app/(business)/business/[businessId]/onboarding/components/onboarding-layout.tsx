import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = ["Unternehmen", "Website", "Kalender"] as const;

export function OnboardingLayout({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10">
        <div className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((name, index) => {
            const num = index + 1;
            const done = num < step;
            const active = num === step;
            return (
              <div key={name} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : (
                      num
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:block",
                      active
                        ? "text-foreground"
                        : done
                          ? "text-emerald-600"
                          : "text-muted-foreground",
                    )}
                  >
                    {name}
                  </span>
                </div>
                {index < STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "h-px w-4 md:w-6",
                      done ? "bg-emerald-400" : "bg-border",
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{
              width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
