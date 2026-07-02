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
import { formatCustomerName } from "@/lib/customer-display";
import type { CustomerOption } from "@/lib/customers";
import { cn } from "@/lib/utils";

export const NO_CUSTOMER_VALUE = "no-customer";
const SEARCH_DEBOUNCE_MS = 300;

export function customerOptionLabel(customer: CustomerOption) {
  return `${formatCustomerName(customer)} (${customer.email})`;
}

export function isCustomerSelected(value: string) {
  return Boolean(value) && value !== NO_CUSTOMER_VALUE;
}

function mergeKnownCustomers(
  knownCustomers: CustomerOption[],
  results: CustomerOption[],
) {
  const merged = new Map<string, CustomerOption>();

  for (const customer of knownCustomers) {
    merged.set(customer.id, customer);
  }

  for (const customer of results) {
    merged.set(customer.id, customer);
  }

  return merged;
}

type CustomerComboboxProps = {
  businessId: string;
  value: string;
  onValueChange: (value: string) => void;
  knownCustomers?: CustomerOption[];
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function CustomerCombobox({
  businessId,
  value,
  onValueChange,
  knownCustomers = [],
  id,
  placeholder = "Kunde auswählen",
  searchPlaceholder = "Kunde suchen …",
  allowEmpty = false,
  emptyLabel = "Kein Kunde",
  disabled = false,
  className,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [selectedCache, setSelectedCache] = useState<CustomerOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const activeSelectedCache =
    selectedCache?.id === value ? selectedCache : null;

  const customerLookup = useMemo(() => {
    const merged = mergeKnownCustomers(knownCustomers, results);
    if (activeSelectedCache) {
      merged.set(activeSelectedCache.id, activeSelectedCache);
    }
    return merged;
  }, [activeSelectedCache, knownCustomers, results]);

  const selectedCustomer = isCustomerSelected(value)
    ? customerLookup.get(value)
    : undefined;

  const displayLabel = selectedCustomer
    ? customerOptionLabel(selectedCustomer)
    : allowEmpty && value === NO_CUSTOMER_VALUE
      ? emptyLabel
      : placeholder;

  const hasSelection =
    Boolean(selectedCustomer) || (allowEmpty && value === NO_CUSTOMER_VALUE);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setFetchError(null);
    }
  }

  function handleSelect(nextValue: string) {
    if (nextValue === NO_CUSTOMER_VALUE) {
      setSelectedCache(null);
    } else {
      const customer =
        results.find((entry) => entry.id === nextValue) ??
        customerLookup.get(nextValue);
      if (customer) {
        setSelectedCache(customer);
      }
    }

    onValueChange(nextValue);
    setOpen(false);
    setQuery("");
    setFetchError(null);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();

    async function fetchCustomers() {
      setLoading(true);
      setFetchError(null);

      try {
        const params = new URLSearchParams();
        const trimmedQuery = debouncedQuery.trim();
        if (trimmedQuery) {
          params.set("q", trimmedQuery);
        }

        const response = await fetch(
          `/api/business/${businessId}/customers/options?${params.toString()}`,
          { signal: controller.signal },
        );
        const data = (await response.json().catch(() => ({}))) as {
          customers?: CustomerOption[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Kunden konnten nicht geladen werden.");
        }

        setResults(data.customers ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
        setFetchError(
          error instanceof Error
            ? error.message
            : "Kunden konnten nicht geladen werden.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchCustomers();

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
            !hasSelection && "text-muted-foreground",
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
        <div className="p-1">
          {allowEmpty ? (
            <button
              type="button"
              className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                value === NO_CUSTOMER_VALUE && "bg-accent text-accent-foreground",
              )}
              onClick={() => handleSelect(NO_CUSTOMER_VALUE)}
            >
              <Check
                className={cn(
                  "mr-2 size-4 shrink-0",
                  value === NO_CUSTOMER_VALUE ? "opacity-100" : "opacity-0",
                )}
              />
              {emptyLabel}
            </button>
          ) : null}
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
              Kein Kunde gefunden.
            </p>
          ) : (
            results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === customer.id && "bg-accent text-accent-foreground",
                )}
                onClick={() => handleSelect(customer.id)}
              >
                <Check
                  className={cn(
                    "mr-2 size-4 shrink-0",
                    value === customer.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate text-left">
                  {customerOptionLabel(customer)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
