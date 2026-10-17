import type { Metadata } from "next";
import Link from "next/link";
import LogoMark from "@/components/logo-mark";

import SignInForm from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in | Reverse Network",
  description: "Sign in to reverse engineer, customize and deploy your own protocol.",
};

export default function SignInPage() {
  return (
    <main className="grid min-h-screen bg-white text-zinc-950 md:grid-cols-2">
      <section
        aria-hidden="true"
        className="relative hidden overflow-hidden bg-zinc-900 text-white md:block"
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero-night-hills.png"
        >
          <source src="/sign-in%20vid.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 via-zinc-950/10 to-zinc-950/30" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="max-w-md text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            Rewind any protocol. Make it yours.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12">
        <Link
          href="/"
          aria-label="Reverse Network home"
          className="flex w-fit items-center gap-3 font-display text-xl font-extrabold tracking-[-0.08em] [word-spacing:0.22em] sm:text-2xl"
        >
          <LogoMark className="h-7 w-auto" />
          REVERSE NETWORK
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-4xl font-semibold tracking-tighter sm:text-5xl">
            Sign in
          </h1>
          <p className="mb-8 mt-3 text-zinc-600">
            Save your work, customize and deploy. New here? An account is
            created automatically.
          </p>
          <SignInForm />
        </div>

        <p className="text-center text-xs text-zinc-500">
          By continuing you agree to our terms and privacy policy.
        </p>
      </section>
    </main>
  );
}
