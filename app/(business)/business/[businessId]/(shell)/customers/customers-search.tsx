"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { businessCustomersPath } from "@/lib/business-paths";
import { Input } from "@/components/ui/input";

export function CustomersSearch({ businessId }: { businessId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    router.push(`${businessCustomersPath(businessId)}${suffix}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full sm:w-56">
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        defaultValue={q}
        placeholder="Kunden suchen…"
        className="bg-card pl-9"
      />
    </form>
  );
}
