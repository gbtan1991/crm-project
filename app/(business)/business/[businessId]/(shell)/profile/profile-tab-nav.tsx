"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  businessProfilePath,
  businessSettingsPath,
  resolveBusinessProfileTab,
  resolveBusinessSettingsTab,
  type BusinessProfileTab,
  type BusinessSettingsTab,
} from "@/lib/business-paths";
import { cn } from "@/lib/utils";

const TABS: { id: BusinessProfileTab; label: string }[] = [
  { id: "details", label: "Profildetails" },
  { id: "password", label: "Passwort ändern" },
];

export function ProfileTabNav({ businessId }: { businessId: string }) {
  const searchParams = useSearchParams();
  const activeTab = resolveBusinessProfileTab(searchParams.get("tab"));

  return (
    <nav className="mb-6 flex gap-1 border-b border-border pb-px">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={businessProfilePath(businessId, tab.id)}
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
