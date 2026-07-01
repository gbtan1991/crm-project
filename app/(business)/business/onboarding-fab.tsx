"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

import { businessOnboardingPath } from "@/lib/business-paths";
import { Button } from "@/components/ui/button";

export function OnboardingFab({
  businessId,
  show,
}: {
  businessId: string;
  show: boolean;
}) {
  const pathname = usePathname();
  const onboardingPath = businessOnboardingPath(businessId);

  if (!show || pathname === onboardingPath) {
    return null;
  }

  return (
    <div className="fixed right-6 top-1/2 z-50 -translate-y-1/2">
      <Button
        asChild
        size="lg"
        className="h-auto rounded-full px-5 py-4 shadow-lg"
      >
        <Link href={onboardingPath}>
          <Sparkles className="size-4" />
          <span className="max-w-[9rem] text-left text-sm leading-tight">
            Einrichtung abschliessen
          </span>
        </Link>
      </Button>
    </div>
  );
}
