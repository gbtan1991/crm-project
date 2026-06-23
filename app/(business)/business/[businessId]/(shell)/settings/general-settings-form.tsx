"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GeneralSettingsForm({
  businessId,
  initialName,
  initialTimezone,
}: {
  businessId: string;
  initialName: string;
  initialTimezone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        `/api/business/${businessId}/settings/general`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, timezone }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update settings.");
      }

      toast.success("Business settings updated.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business name</Label>
            <Input
              id="business-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-timezone">Timezone</Label>
            <Input
              id="business-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="America/New_York"
              required
            />
            <p className="text-xs text-muted-foreground">
              Used for appointments, reminders, and calendar sync. IANA timezone
              name (for example, Europe/London).
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
