"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  businessSettingsPath,
  resolveBusinessSettingsTab,
  type BusinessSettingsTab,
} from "@/lib/business-paths";
import { cn } from "@/lib/utils";

const TABS: { id: BusinessSettingsTab; label: string }[] = [
  { id: "calendar", label: "Kalender" },
  { id: "general", label: "Allgemein" },
  { id: "website", label: "Website" },
];

export function SettingsTabNav({ businessId }: { businessId: string }) {
  const searchParams = useSearchParams();
  const activeTab = resolveBusinessSettingsTab(searchParams.get("tab"));

  return (
    <nav className="mb-6 flex gap-1 border-b border-border pb-px">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={businessSettingsPath(businessId, tab.id)}
          className={cn(
            "inline-flex shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            activeTab === tab.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
