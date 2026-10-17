"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { useSigningOut } from "@/components/dashboard/dashboard-shell";

function Loading() {
  return (
    <p role="status" className="text-zinc-500">
      Loading your workspace...
    </p>
  );
}

function Redirecting() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sign-in");
  }, [router]);

  return <Loading />;
}

function PrivyGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const signingOut = useSigningOut();
  const { ready, authenticated } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated && !signingOut?.current) {
      router.replace("/sign-in");
    }
  }, [ready, authenticated, router, signingOut]);

  if (!ready || !authenticated) return <Loading />;
  return <>{children}</>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return <Redirecting />;
  return <PrivyGate>{children}</PrivyGate>;
}
