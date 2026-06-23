"use client";

import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { businessProfilePath, businessSettingsPath } from "@/lib/business-paths";
import { cn } from "@/lib/utils";

function getUserInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "U";
}

export function BusinessUserMenu({
  businessId,
  name,
  email,
}: {
  businessId: string;
  name?: string | null;
  email?: string | null;
}) {
  const initials = getUserInitials(name, email);
  const profilePath = businessProfilePath(businessId);
  const settingsPath = businessSettingsPath(businessId, "calendar");
  const displayName = name?.trim() || email || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-full p-0"
          aria-label="Open account menu"
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              "bg-primary/10 text-xs font-semibold text-primary",
            )}
          >
            {initials}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate font-medium text-foreground">
              {displayName}
            </span>
            {email ? (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {email}
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profilePath}>
            <User />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={settingsPath}>
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <form action={signOutAction} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-left"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
