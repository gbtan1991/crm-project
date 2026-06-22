"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Check,
  Globe,
  Loader2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import { IntegrationCard } from "@/app/(business)/business/[businessId]/onboarding/components/integration-card";
import { OnboardingLayout } from "@/app/(business)/business/[businessId]/onboarding/components/onboarding-layout";
import { StepCard } from "@/app/(business)/business/[businessId]/onboarding/components/step-card";
import {
  businessDashboardPath,
  businessOnboardingPath,
} from "@/lib/business-paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingState } from "@/lib/onboarding";
import { CALENDAR_PROVIDERS } from "@/lib/validation/onboarding";

type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

type CompanyForm = OnboardingState["company"] & { name: string };
type WebsiteForm = OnboardingState["website"];

const CALENDAR_OPTIONS: {
  id: CalendarProvider;
  name: string;
  description: string;
}[] = [
  {
    id: "GOOGLE",
    name: "Google Calendar",
    description: "Gmail, Google Workspace",
  },
  {
    id: "OUTLOOK",
    name: "Microsoft Outlook",
    description: "Outlook Desktop & Web, Microsoft 365",
  },
];

export function OnboardingWizard({
  businessId,
  initialState,
}: {
  businessId: string;
  initialState: OnboardingState;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthSuccess = searchParams.get("oauth_success");
  const oauthError = searchParams.get("error");
  const [step, setStep] = useState(
    oauthSuccess || oauthError
      ? 3
      : initialState.completedAt
        ? 1
        : initialState.step,
  );
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyForm>({
    name: initialState.name,
    ...initialState.company,
  });
  const [website, setWebsite] = useState<WebsiteForm>(initialState.website);
  const [calendarProvider, setCalendarProvider] = useState<CalendarProvider | "">(
    (initialState.calendar.provider as CalendarProvider | null) ?? "",
  );
  const [calendarConnected] = useState(
    initialState.calendar.isConnected,
  );
  const [connectedProvider] = useState<CalendarProvider | null>(
    initialState.calendar.isConnected
      ? (initialState.calendar.provider as CalendarProvider)
      : null,
  );
  const [calendarEmail] = useState(
    initialState.calendar.accountEmail ?? "",
  );

  useEffect(() => {
    if (oauthSuccess === "google") {
      toast.success("Google Calendar connected.");
      router.replace(businessOnboardingPath(businessId));
    } else if (oauthSuccess === "outlook") {
      toast.success("Outlook Calendar connected.");
      router.replace(businessOnboardingPath(businessId));
    } else if (oauthError) {
      toast.error("Calendar connection failed. Please try again.");
      router.replace(businessOnboardingPath(businessId));
    }
  }, [oauthSuccess, oauthError, businessId, router]);

  async function saveStep(
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/business/${businessId}/onboarding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleCompanyNext() {
    const ok = await saveStep({
      step: 1,
      name: company.name,
      contactPerson: company.contactPerson,
      businessEmail: company.businessEmail,
      phone: company.phone,
      address: company.address,
      postalCode: company.postalCode,
      city: company.city,
      taxId: company.taxId,
      billingAddress: company.billingAddress,
      logoUrl: company.logoUrl,
    });
    if (ok) setStep(2);
  }

  async function handleWebsiteNext() {
    const ok = await saveStep({ step: 2, ...website });
    if (ok) setStep(3);
  }

  async function handleWebsiteSkip() {
    const ok = await saveStep({ step: 2, ...website });
    if (ok) setStep(3);
  }

  async function connectCalendar(provider: CalendarProvider) {
    setError(null);
    setConnecting(true);
    setCalendarProvider(provider);

    const endpoint =
      provider === "GOOGLE"
        ? "/api/google-calendar/auth"
        : "/api/outlook-calendar/auth";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          redirectPath: businessOnboardingPath(businessId),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authUrl) {
        setError(data.error ?? "Failed to start calendar connection.");
        return;
      }
      window.location.href = data.authUrl as string;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleCalendarNext(complete: boolean) {
    const ok = await saveStep({
      step: 3,
      provider: calendarProvider || undefined,
      complete,
    });
    if (!ok) return;
    if (complete) {
      toast.success("Setup complete!");
      router.push(businessDashboardPath(businessId));
      router.refresh();
    }
  }

  return (
    <OnboardingLayout step={step}>
      {error ? (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <StepCard
          title="Company details"
          subtitle="These details are used on invoices, quotes, and customer emails."
          icon={Building2}
          nextDisabled={!company.name.trim()}
          saving={saving}
          onNext={() => void handleCompanyNext()}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Business name *</Label>
            <Input
              id="name"
              value={company.name}
              onChange={(e) =>
                setCompany({ ...company, name: e.target.value })
              }
              placeholder="Acme Roofing Ltd"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input
                id="contactPerson"
                value={company.contactPerson}
                onChange={(e) =>
                  setCompany({ ...company, contactPerson: e.target.value })
                }
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={company.phone}
                onChange={(e) =>
                  setCompany({ ...company, phone: e.target.value })
                }
                placeholder="+41 44 123 45 67"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessEmail">Business email</Label>
            <Input
              id="businessEmail"
              type="email"
              value={company.businessEmail}
              onChange={(e) =>
                setCompany({ ...company, businessEmail: e.target.value })
              }
              placeholder="info@acme.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={company.address}
              onChange={(e) =>
                setCompany({ ...company, address: e.target.value })
              }
              placeholder="Main Street 1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input
                id="postalCode"
                value={company.postalCode}
                onChange={(e) =>
                  setCompany({ ...company, postalCode: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={company.city}
                onChange={(e) =>
                  setCompany({ ...company, city: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax / UID number</Label>
            <Input
              id="taxId"
              value={company.taxId}
              onChange={(e) =>
                setCompany({ ...company, taxId: e.target.value })
              }
              placeholder="CHE-123.456.789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingAddress">Billing address (if different)</Label>
            <Textarea
              id="billingAddress"
              value={company.billingAddress}
              onChange={(e) =>
                setCompany({ ...company, billingAddress: e.target.value })
              }
              placeholder="Only if different from the company address"
            />
          </div>
        </StepCard>
      ) : null}

      {step === 2 ? (
        <StepCard
          title="Website"
          subtitle="Connect your online presence with MeisterFlow."
          icon={Globe}
          saving={saving}
          allowSkip
          onBack={() => setStep(1)}
          onSkip={() => void handleWebsiteSkip()}
          onNext={() => void handleWebsiteNext()}
        >
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={website.domain}
              onChange={(e) =>
                setWebsite({ ...website, domain: e.target.value })
              }
              placeholder="www.acme.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hostingAccess">Hosting provider (optional)</Label>
            <Input
              id="hostingAccess"
              value={website.hostingAccess}
              onChange={(e) =>
                setWebsite({ ...website, hostingAccess: e.target.value })
              }
              placeholder="e.g. Hostpoint, Infomaniak"
            />
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {[
              {
                key: "hasWebsite" as const,
                label: "Existing website",
                sub: "You already have an active website",
              },
              {
                key: "hasGoogleAnalytics" as const,
                label: "Google Analytics",
                sub: "Visitor tracking is already set up",
              },
              {
                key: "hasSearchConsole" as const,
                label: "Google Search Console",
                sub: "Search performance is already monitored",
              },
            ].map(({ key, label, sub }) => (
              <div
                key={key}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <Switch
                  checked={website[key]}
                  onCheckedChange={(checked) =>
                    setWebsite({ ...website, [key]: checked })
                  }
                />
              </div>
            ))}
          </div>
        </StepCard>
      ) : null}

      {step === 3 ? (
        <StepCard
          title="Connect calendar"
          subtitle="Connect your calendar so MeisterFlow can listen for booking activity."
          icon={CalendarDays}
          saving={saving}
          allowSkip
          nextLabel="Finish setup"
          onBack={() => setStep(2)}
          onSkip={() => void handleCalendarNext(true)}
          onNext={() => void handleCalendarNext(true)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {CALENDAR_OPTIONS.map((opt) => (
              <IntegrationCard
                key={opt.id}
                name={opt.name}
                description={opt.description}
                icon={
                  opt.id === "GOOGLE" ? (
                    <CalendarDays className="size-6 text-blue-600" />
                  ) : (
                    <Mail className="size-6 text-sky-600" />
                  )
                }
                selected={calendarProvider === opt.id}
                connected={
                  connectedProvider === opt.id
                }
                onSelect={() => setCalendarProvider(opt.id)}
              />
            ))}
          </div>

          {calendarProvider ? (
            <Button
              type="button"
              variant={
                connectedProvider === calendarProvider ? "outline" : "default"
              }
              className="w-full"
              disabled={connecting || connectedProvider === calendarProvider}
              onClick={() => void connectCalendar(calendarProvider)}
            >
              {connecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Redirecting…
                </>
              ) : connectedProvider === calendarProvider ? (
                "Connected"
              ) : calendarProvider === "GOOGLE" ? (
                "Connect Google Calendar"
              ) : (
                "Connect Microsoft Outlook"
              )}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Select a calendar provider above to continue.
            </p>
          )}

          {calendarConnected && calendarEmail ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500">
                <Check className="size-4 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Calendar connected
                </p>
                <p className="text-xs text-emerald-600">{calendarEmail}</p>
              </div>
            </div>
          ) : calendarProvider && !calendarConnected ? (
            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-500">
                <Check className="size-4 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  {CALENDAR_OPTIONS.find((o) => o.id === calendarProvider)?.name}{" "}
                  selected
                </p>
                <p className="text-xs text-blue-600">
                  Authorize access to start syncing calendar events.
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Once connected, MeisterFlow will listen for:
            </p>
            <ul className="space-y-1">
              {[
                "New bookings",
                "Rescheduled appointments",
                "Cancelled appointments",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <Check className="size-3.5 text-emerald-500" strokeWidth={3} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </StepCard>
      ) : null}
    </OnboardingLayout>
  );
}
