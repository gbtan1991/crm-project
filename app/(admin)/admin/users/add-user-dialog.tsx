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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Role = "BUSINESS" | "ADMIN";

export function AddUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("BUSINESS");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setError(null);
    setRole("BUSINESS");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const base = {
      role,
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    const payload =
      role === "BUSINESS"
        ? { ...base, businessName: String(formData.get("businessName") ?? "") }
        : base;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Failed to create user.");
        return;
      }

      toast.success(
        role === "BUSINESS"
          ? `Business user "${base.email}" created.`
          : `Admin "${base.email}" created.`,
      );
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
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a business owner or a platform administrator.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={role}
          onValueChange={(value) => {
            setRole(value as Role);
            setError(null);
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="BUSINESS">Business</TabsTrigger>
            <TabsTrigger value="ADMIN">Admin</TabsTrigger>
          </TabsList>

          {/* One form drives both tabs; `key` resets fields when switching. */}
          <form key={role} onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error ? (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <TabsContent value="BUSINESS" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  placeholder="Acme Studio"
                  required={role === "BUSINESS"}
                />
              </div>
            </TabsContent>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder={role === "BUSINESS" ? "Jordan Owner" : "Jane Admin"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={
                  role === "BUSINESS"
                    ? "owner@acme.com"
                    : "jane@meisterflow.com"
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Temporary password</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : role === "BUSINESS" ? (
                  "Create business"
                ) : (
                  "Create admin"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
