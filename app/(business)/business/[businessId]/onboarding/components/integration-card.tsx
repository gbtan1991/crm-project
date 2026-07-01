import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function IntegrationCard({
  name,
  description,
  icon,
  selected = false,
  connected = false,
  comingSoon = false,
  onSelect,
}: {
  name: string;
  description?: string;
  icon: React.ReactNode;
  selected?: boolean;
  connected?: boolean;
  comingSoon?: boolean;
  onSelect?: () => void;
}) {
  return (
    <div
      onClick={!comingSoon ? onSelect : undefined}
      className={cn(
        "flex items-start gap-4 rounded-xl border p-4 transition-all",
        !comingSoon && "cursor-pointer hover:shadow-md",
        selected && "border-primary bg-accent shadow-sm",
        !selected &&
          !comingSoon &&
          "border-border bg-card hover:border-primary/50",
        comingSoon && "cursor-default border-border bg-muted/50 opacity-60",
      )}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-white shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {comingSoon ? (
            <span className="rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
              Demnächst
            </span>
          ) : null}
          {connected ? (
            <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              <Check className="size-3" />
              Verbunden
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {selected && !connected ? (
        <Check className="mt-0.5 size-5 shrink-0 text-primary" />
      ) : null}
    </div>
  );
}
