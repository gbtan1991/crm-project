"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  emptyEnquiryFormValues,
  EnquiryFormFields,
} from "@/app/(business)/business/[businessId]/(shell)/enquiries/enquiry-form-fields";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormRow } from "@/lib/forms";

export function AddEnquiryDialog({
  businessId,
  forms,
}: {
  businessId: string;
  forms: FormRow[];
}) {
  const router = useRouter();
  const activeForms = useMemo(
    () => forms.filter((form) => form.isActive),
    [forms],
  );

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formId, setFormId] = useState(activeForms[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>(
    activeForms[0] ? emptyEnquiryFormValues(activeForms[0].fields) : {},
  );

  const selectedForm = activeForms.find((form) => form.id === formId);

  function reset() {
    setFormId(activeForms[0]?.id ?? "");
    setValues(
      activeForms[0] ? emptyEnquiryFormValues(activeForms[0].fields) : {},
    );
    setError(null);
  }

  function handleFormChange(nextFormId: string) {
    setFormId(nextFormId);
    const nextForm = activeForms.find((form) => form.id === nextFormId);
    setValues(nextForm ? emptyEnquiryFormValues(nextForm.fields) : {});
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedForm) {
      setError("Create an active form before adding enquiries.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/business/${businessId}/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: selectedForm.id,
          data: values,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Failed to create enquiry.");
        return;
      }

      toast.success("Enquiry added.");
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={activeForms.length === 0}>
          <Plus className="size-4" />
          Add new
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Add enquiry</DialogTitle>
            <DialogDescription>
              Manually record an enquiry using one of your active forms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {activeForms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active forms yet. Create a form on the Forms tab first.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Form</Label>
                  <Select value={formId} onValueChange={handleFormChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a form" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeForms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedForm ? (
                  <EnquiryFormFields
                    fields={selectedForm.fields}
                    values={values}
                    onChange={(key, value) =>
                      setValues((current) => ({ ...current, [key]: value }))
                    }
                  />
                ) : null}
              </>
            )}

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || activeForms.length === 0 || !selectedForm}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Add enquiry"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
