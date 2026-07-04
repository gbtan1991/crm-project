"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { SerpLocationOption } from "@/lib/seo-visibility/serp-location-types";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 300;

export function serpLocationOptionLabel(location: SerpLocationOption) {
  return location.locationName;
}

type SerpLocationComboboxProps = {
  businessId: string;
  value: number | null;
  onValueChange: (location: SerpLocationOption) => void;
  defaultLocation?: SerpLocationOption | null;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
};

export function SerpLocationCombobox({
  businessId,
  value,
  onValueChange,
  defaultLocation = null,
  id,
  placeholder = "Standort auswählen",
  searchPlaceholder = "Standort suchen …",
  disabled = false,
  className,
}: SerpLocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SerpLocationOption[]>([]);
  const [selectedCache, setSelectedCache] = useState<SerpLocationOption | null>(
    defaultLocation,
  );
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const selectedLocation = useMemo(() => {
    if (value == null) return null;
    if (selectedCache?.locationCode === value) {
      return selectedCache;
    }
    if (defaultLocation?.locationCode === value) {
      return defaultLocation;
    }
    return results.find((location) => location.locationCode === value) ?? null;
  }, [defaultLocation, results, selectedCache, value]);

  const displayLabel = selectedLocation
    ? serpLocationOptionLabel(selectedLocation)
    : placeholder;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setFetchError(null);
    }
  }

  function handleSelect(location: SerpLocationOption) {
    setSelectedCache(location);
    onValueChange(location);
    setOpen(false);
    setQuery("");
    setFetchError(null);
  }

  useEffect(() => {
    if (value == null) return;
    if (selectedCache?.locationCode === value) return;
    if (defaultLocation?.locationCode === value) {
      setSelectedCache(defaultLocation);
    }
  }, [defaultLocation, selectedCache?.locationCode, value]);

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    async function fetchLocations() {
      setLoading(true);
      setFetchError(null);

      try {
        const params = new URLSearchParams();
        const trimmedQuery = debouncedQuery.trim();
        if (trimmedQuery) {
          params.set("q", trimmedQuery);
        }

        const response = await fetch(
          `/api/business/${businessId}/serp-locations?${params.toString()}`,
          { signal: controller.signal },
        );
        const data = (await response.json().catch(() => ({}))) as {
          locations?: SerpLocationOption[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Standorte konnten nicht geladen werden.");
        }

        setResults(data.locations ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setFetchError(
          error instanceof Error
            ? error.message
            : "Standorte konnten nicht geladen werden.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchLocations();

    return () => {
      controller.abort();
    };
  }, [businessId, debouncedQuery, open]);

  const isDebouncing = open && query.trim() !== debouncedQuery.trim();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal shadow-sm",
            !selectedLocation && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        portalled={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b p-2">
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
              }
            }}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {loading || isDebouncing ? (
            <div className="flex items-center justify-center gap-2 px-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Suche …
            </div>
          ) : fetchError ? (
            <p className="px-2 py-6 text-center text-sm text-destructive">
              {fetchError}
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Kein Standort gefunden.
            </p>
          ) : (
            results.map((location) => (
              <button
                key={location.locationCode}
                type="button"
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === location.locationCode &&
                    "bg-accent text-accent-foreground",
                )}
                onClick={() => handleSelect(location)}
              >
                <Check
                  className={cn(
                    "mr-2 size-4 shrink-0",
                    value === location.locationCode ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate text-left">
                  {serpLocationOptionLabel(location)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
