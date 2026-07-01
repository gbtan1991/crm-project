"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { PasswordInput } from "@/components/ui/password-input";

export function AddBusinessDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      ownerName: String(formData.get("ownerName") ?? ""),
      ownerEmail: String(formData.get("ownerEmail") ?? ""),
      ownerPassword: String(formData.get("ownerPassword") ?? ""),
    };

    try {
      const res = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Unternehmen konnte nicht erstellt werden.");
        return;
      }

      toast.success(`Unternehmen «${payload.name}» erstellt.`);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Unternehmen hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unternehmen hinzufügen</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen neuen Mandanten und den ersten Geschäftsbenutzer.
            Sie starten mit dem BASIC-Plan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Firmenname</Label>
            <Input id="name" name="name" placeholder="Acme Dach AG" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerName">Name des Inhabers</Label>
            <Input id="ownerName" name="ownerName" placeholder="Jane Doe" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">E-Mail des Inhabers</Label>
            <Input
              id="ownerEmail"
              name="ownerEmail"
              type="email"
              placeholder="jane@acme.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPassword">Temporäres Passwort</Label>
            <PasswordInput
              id="ownerPassword"
              name="ownerPassword"
              placeholder="Mindestens 8 Zeichen"
              minLength={8}
              required
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Wird erstellt…
                </>
              ) : (
                "Unternehmen erstellen"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
