"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, Loader2, Lock, Mail } from "lucide-react";

import { loginAction } from "@/app/actions/auth";
import {
  requestPasswordResetOtpAction,
  resetPasswordWithOtpAction,
  verifyPasswordResetOtpAction,
  type PasswordResetActionState,
} from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const loginInitialState = { error: undefined as string | undefined };
const resetInitialState: PasswordResetActionState = {};

type Mode = "login" | "forgot";
type ForgotStep = "email" | "otp" | "password";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loginState, loginActionBound, loginPending] = useActionState(
    loginAction,
    loginInitialState,
  );
  const [requestState, requestAction, requestPending] = useActionState(
    async (prev: PasswordResetActionState, formData: FormData) => {
      const result = await requestPasswordResetOtpAction(prev, formData);
      if (result.success) {
        setForgotStep("otp");
      }
      return result;
    },
    resetInitialState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetPasswordWithOtpAction,
    resetInitialState,
  );

  function openForgotPassword() {
    setMode("forgot");
    setForgotStep("email");
    setOtp("");
  }

  function backToLogin() {
    setMode("login");
    setForgotStep("email");
    setOtp("");
  }

  if (mode === "forgot") {
    if (forgotStep === "email") {
      return (
        <form action={requestAction} className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold">Passwort zurücksetzen</h2>
            <p className="text-sm text-muted-foreground">
              Geben Sie Ihre Konto-E-Mail ein. Wir senden einen Bestätigungscode
              über Ihr verbundenes Google- oder Outlook-Postfach.
            </p>
          </div>

          {requestState.error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {requestState.error}
            </div>
          ) : null}
          {requestState.success ? (
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              {requestState.success}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="reset-email">E-Mail</Label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="sie@beispiel.ch"
                className="h-12 pl-10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="h-12 w-full font-medium"
            disabled={requestPending}
          >
            {requestPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Code wird gesendet…
              </>
            ) : (
              "Bestätigungscode senden"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={backToLogin}
          >
            <ArrowLeft className="size-4" />
            Zurück zur Anmeldung
          </Button>
        </form>
      );
    }

    if (forgotStep === "otp") {
      return (
        <VerifyOtpStep
          email={email}
          onBack={() => setForgotStep("email")}
          onVerified={(verifiedOtp) => {
            setOtp(verifiedOtp);
            setForgotStep("password");
          }}
        />
      );
    }

    return (
      <form action={resetAction} className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">Neues Passwort wählen</h2>
          <p className="text-sm text-muted-foreground">
            Ihr Bestätigungscode wurde akzeptiert. Legen Sie ein neues Passwort fest,
            um den Vorgang abzuschliessen und sich anzumelden.
          </p>
        </div>

        {resetState.error ? (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {resetState.error}
          </div>
        ) : null}

        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="otp" value={otp} />

        <div className="space-y-2">
          <Label htmlFor="new-password">Neues Passwort</Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <PasswordInput
              id="new-password"
              name="newPassword"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              className="h-12 pl-10"
              minLength={8}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Neues Passwort bestätigen</Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              className="h-12 pl-10"
              minLength={8}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-12 w-full font-medium"
          disabled={resetPending}
        >
          {resetPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Passwort wird zurückgesetzt…
            </>
          ) : (
            "Passwort zurücksetzen und anmelden"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setForgotStep("otp")}
        >
          <ArrowLeft className="size-4" />
          Zurück
        </Button>
      </form>
    );
  }

  return (
    <form action={loginActionBound} className="space-y-4">
      {loginState.error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {loginState.error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="sie@beispiel.ch"
            className="h-12 pl-10"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Passwort</Label>
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={openForgotPassword}
          >
            Passwort vergessen?
          </button>
        </div>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-12 pl-10"
            required
          />
        </div>
      </div>

      <Button type="submit" className="h-12 w-full font-medium" disabled={loginPending}>
        {loginPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Anmeldung läuft…
          </>
        ) : (
          "Anmelden"
        )}
      </Button>
    </form>
  );
}

function VerifyOtpStep({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: (otp: string) => void;
}) {
  const [otpInput, setOtpInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await verifyPasswordResetOtpAction(resetInitialState, formData);

    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    onVerified(String(formData.get("otp") ?? ""));
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold">Bestätigungscode eingeben</h2>
        <p className="text-sm text-muted-foreground">
          Wir haben einen 6-stelligen Code an <strong>{email}</strong> gesendet.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <input type="hidden" name="email" value={email} />

      <div className="space-y-2">
        <Label htmlFor="reset-otp">Bestätigungscode</Label>
        <Input
          id="reset-otp"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="h-12 text-center text-lg tracking-[0.3em]"
          pattern="\d{6}"
          maxLength={6}
          value={otpInput}
          onChange={(event) => setOtpInput(event.target.value)}
          required
        />
      </div>

      <Button type="submit" className="h-12 w-full font-medium" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Wird überprüft…
          </>
        ) : (
          "Weiter"
        )}
      </Button>

      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Zurück
      </Button>
    </form>
  );
}
