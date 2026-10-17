"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useLoginWithEmail,
  useLoginWithOAuth,
  usePrivy,
} from "@privy-io/react-auth";

import { cn } from "@/lib/utils";

type Provider = "google";

interface SignInViewProps {
  step: "start" | "code";
  email: string;
  code: string;
  busy: boolean;
  error: string | null;
  /** Progress message shown while a sign-in is finishing */
  status?: string | null;
  disabled?: boolean;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onVerifyCode: () => void;
  onBack: () => void;
  onOAuth: (provider: Provider) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.73z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

const socialButton =
  "flex w-full items-center justify-center gap-3 rounded-full border border-zinc-300 bg-white px-6 py-3.5 text-base font-semibold text-zinc-950 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";

function SignInView({
  step,
  email,
  code,
  busy,
  error,
  status,
  disabled,
  onEmailChange,
  onCodeChange,
  onSendCode,
  onVerifyCode,
  onBack,
  onOAuth,
}: SignInViewProps) {
  const locked = busy || disabled;

  if (step === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onVerifyCode();
        }}
        className="space-y-5"
      >
        <p className="text-zinc-600">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-zinc-950">{email}</span>.
        </p>
        <div>
          <label htmlFor="otp" className="sr-only">
            6-digit code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            aria-invalid={!!error}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-5 py-3.5 text-center font-mono text-2xl tracking-[0.5em] text-zinc-950 outline-none placeholder:text-zinc-300 focus:border-zinc-950"
          />
        </div>
        <button
          type="submit"
          disabled={locked || code.length !== 6}
          className="w-full rounded-full bg-ink px-6 py-3.5 text-base font-bold text-white transition-colors enabled:hover:bg-signal enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Verifying..." : "Verify and continue"}
        </button>
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-zinc-950"
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={onSendCode}
            disabled={locked}
            className="hover:text-zinc-950 disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
        <p role="alert" className="min-h-5 text-sm text-red-600">
          {error}
        </p>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <button
          type="button"
          disabled={locked}
          onClick={() => onOAuth("google")}
          className={socialButton}
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>

      <div className="flex items-center gap-4 text-sm text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        or
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSendCode();
        }}
        className="space-y-3"
      >
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-full border bg-white px-6 py-3.5 text-base text-zinc-950 outline-none placeholder:text-zinc-400",
            error ? "border-red-500" : "border-zinc-300 focus:border-zinc-950",
          )}
        />
        <button
          type="submit"
          disabled={locked || !EMAIL_PATTERN.test(email.trim())}
          className="w-full rounded-full bg-ink px-6 py-3.5 text-base font-bold text-white transition-colors enabled:hover:bg-signal enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sending code..." : "Continue with email"}
        </button>
      </form>
      {status && (
        <p role="status" className="text-sm font-semibold text-zinc-700">
          {status}
        </p>
      )}
      <p role="alert" className="min-h-5 text-sm text-red-600">
        {error}
      </p>
    </div>
  );
}

function PrivySignIn() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const [step, setStep] = useState<"start" | "code">("start");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onComplete = () => router.replace("/dashboard");
  const emailLogin = useLoginWithEmail({ onComplete });
  const oauthLogin = useLoginWithOAuth({ onComplete });
  const oauthStatus = oauthLogin.state.status;
  const oauthError =
    oauthLogin.state.status === "error" ? oauthLogin.state.error : null;

  useEffect(() => {
    if (!ready || !authenticated) return;
    router.replace("/dashboard");
    // If the soft navigation doesn't land (it can stall right after an OAuth redirect), reload into it
    const fallback = setTimeout(
      () => window.location.replace("/dashboard"),
      1500,
    );
    return () => clearTimeout(fallback);
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (oauthError) console.error("OAuth sign-in failed:", oauthError.message);
  }, [oauthError]);

  async function run(task: () => Promise<void>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch {
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SignInView
      step={step}
      email={email}
      code={code}
      busy={busy || !ready || oauthStatus === "loading" || authenticated}
      status={
        authenticated
          ? "Signed in. Opening your workspace..."
          : oauthStatus === "loading"
            ? "Finishing sign-in..."
            : null
      }
      error={
        error ??
        (oauthStatus === "error"
          ? "Sign-in with that provider didn't finish. " +
            (oauthError?.message ?? "Please try again.")
          : null)
      }
      onEmailChange={(v) => {
        setEmail(v);
        setError(null);
      }}
      onCodeChange={(v) => {
        setCode(v);
        setError(null);
      }}
      onSendCode={() =>
        run(async () => {
          await emailLogin.sendCode({ email: email.trim() });
          setStep("code");
        }, "We couldn't send a code. Check the address and try again.")
      }
      onVerifyCode={() =>
        run(
          () => emailLogin.loginWithCode({ code }),
          "That code didn't work. Check it or request a new one.",
        )
      }
      onBack={() => {
        setStep("start");
        setCode("");
        setError(null);
      }}
      onOAuth={(provider) =>
        run(
          () => oauthLogin.initOAuth({ provider }),
          "Sign-in didn't start. Please try again.",
        )
      }
    />
  );
}

export default function SignInForm() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <div className="space-y-5">
        <SignInView
          step="start"
          email=""
          code=""
          busy={false}
          disabled
          error={null}
          onEmailChange={() => {}}
          onCodeChange={() => {}}
          onSendCode={() => {}}
          onVerifyCode={() => {}}
          onBack={() => {}}
          onOAuth={() => {}}
        />
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sign-in is not configured. Add{" "}
          <code className="font-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> to{" "}
          <code className="font-mono">.env.local</code> and restart the dev
          server.
        </p>
      </div>
    );
  }

  return <PrivySignIn />;
}
