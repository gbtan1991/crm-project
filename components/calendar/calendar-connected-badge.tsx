import Image from "next/image";

import { CALENDAR_PROVIDERS } from "@/lib/validation/onboarding";
import { cn } from "@/lib/utils";

type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

type CalendarConnectedBadgeProps = {
  provider: CalendarProvider | null;
  accountEmail?: string | null;
  className?: string;
};

const PROVIDER_CONFIG: Record<
  CalendarProvider,
  { label: string; icon: string }
> = {
  GOOGLE: {
    label: "Google Calendar",
    icon: "/google-calendar.svg",
  },
  OUTLOOK: {
    label: "Outlook Calendar",
    icon: "/outlook-calendar.svg",
  },
};

export function CalendarConnectedBadge({
  provider,
  accountEmail,
  className,
}: CalendarConnectedBadgeProps) {
  if (!provider) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        Calendar not connected
      </span>
    );
  }

  const config = PROVIDER_CONFIG[provider];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border bg-emerald-50 px-3 py-1.5 text-xs font-medium dark:bg-emerald-950/30",
        className,
      )}
    >
      <Image
        src={config.icon}
        alt={config.label}
        width={16}
        height={16}
        className="size-4 shrink-0"
      />
      <span className="text-emerald-700 dark:text-emerald-400">
        {config.label}
      </span>
      <span className="mx-0.5 text-emerald-300 dark:text-emerald-600">·</span>
      {accountEmail ? (
        <span className="max-w-32 truncate text-emerald-600 dark:text-emerald-500">
          {accountEmail}
        </span>
      ) : (
        <span className="text-emerald-600 dark:text-emerald-500">Connected</span>
      )}
    </span>
  );
}
