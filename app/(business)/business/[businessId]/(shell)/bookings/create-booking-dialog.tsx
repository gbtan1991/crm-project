"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  CustomerFormFields,
  emptyCustomerForm,
  type CustomerFormValues,
} from "@/app/(business)/business/[businessId]/(shell)/customers/customer-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCustomerName } from "@/lib/customer-display";
import type { CustomerOption } from "@/lib/customers";
import { dateTimeLocalToUtcIso, toDateTimeLocalValue } from "@/lib/datetime";

const NO_CUSTOMER_VALUE = "no-customer";

function defaultStartEnd(timeZone: string) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);
  return {
    startsAt: toDateTimeLocalValue(start, timeZone),
    endsAt: toDateTimeLocalValue(end, timeZone),
  };
}

export function CreateBookingDialog({
  businessId,
  calendarConnected,
  customers,
  open,
  timeZone,
  onOpenChange,
  onCreated,
}: {
  businessId: string;
  calendarConnected: boolean;
  customers: CustomerOption[];
  open: boolean;
  timeZone: string;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const defaults = defaultStartEnd(timeZone);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);
  const [customerId, setCustomerId] = useState(NO_CUSTOMER_VALUE);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerValues, setCustomerValues] =
    useState<CustomerFormValues>(emptyCustomerForm);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  function reset() {
    const next = defaultStartEnd(timeZone);
    setTitle("");
    setStartsAt(next.startsAt);
    setEndsAt(next.endsAt);
    setCustomerId(NO_CUSTOMER_VALUE);
    setLocation("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!calendarConnected) {
      setError("Connect a calendar before creating appointments.");
      return;
    }

    if (customerId === NO_CUSTOMER_VALUE) {
      setError("Select or create a customer before creating an appointment.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/business/${businessId}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startsAt: dateTimeLocalToUtcIso(startsAt, timeZone),
          endsAt: dateTimeLocalToUtcIso(endsAt, timeZone),
          customerId,
          location,
          notes,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create appointment.");
      }

      toast.success("Appointment created.");
      onOpenChange(false);
      reset();
      onCreated?.();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to create appointment.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCustomer(event: React.FormEvent) {
    event.preventDefault();
    setCustomerError(null);
    setCustomerSubmitting(true);

    try {
      const response = await fetch(`/api/business/${businessId}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerValues),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create customer.");
      }

      const customer = data.customer as CustomerOption;
      setLocalCustomers((current) => [customer, ...current]);
      setCustomerId(customer.id);
      setCustomerValues(emptyCustomerForm);
      setCustomerOpen(false);
      toast.success("Customer created.");
    } catch (createError) {
      setCustomerError(
        createError instanceof Error
          ? createError.message
          : "Failed to create customer.",
      );
    } finally {
      setCustomerSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New appointment</DialogTitle>
            <DialogDescription>
              Create an appointment in your connected calendar and sync it back
              to MeisterFlow.
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking-title">Title</Label>
            <Input
              id="booking-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-start">Starts</Label>
              <Input
                id="booking-start"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-end">Ends</Label>
              <Input
                id="booking-end"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="booking-customer">Customer *</Label>
              <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="size-4" />
                    New customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <form
                    onSubmit={(event) => void handleCreateCustomer(event)}
                    className="space-y-4"
                  >
                    <DialogHeader>
                      <DialogTitle>New customer</DialogTitle>
                      <DialogDescription>
                        Create a customer, then continue scheduling the
                        appointment.
                      </DialogDescription>
                    </DialogHeader>
                    {customerError ? (
                      <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {customerError}
                      </div>
                    ) : null}
                    <CustomerFormFields
                      values={customerValues}
                      onChange={setCustomerValues}
                      idPrefix="booking-customer"
                    />
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCustomerOpen(false)}
                        disabled={customerSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          customerSubmitting || !customerValues.email.trim()
                        }
                      >
                        {customerSubmitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          "Create customer"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="booking-customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CUSTOMER_VALUE} disabled>
                  Select a customer
                </SelectItem>
                {localCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {formatCustomerName(customer)} ({customer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-location">Location</Label>
            <Input
              id="booking-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="On-site, phone, video call…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-notes">Notes</Label>
            <Textarea
              id="booking-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || customerId === NO_CUSTOMER_VALUE}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create appointment"
              )}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
