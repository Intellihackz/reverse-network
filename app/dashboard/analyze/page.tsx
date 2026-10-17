import { Suspense } from "react";
import type { Metadata } from "next";

import AnalyzeView from "@/components/dashboard/analyze-view";
import AuthGate from "@/components/dashboard/auth-gate";

export const metadata: Metadata = {
  title: "Reversing | Reverse Network",
};

export default function AnalyzePage() {
  return (
    <AuthGate>
      <Suspense fallback={<p role="status" className="text-zinc-500">Loading...</p>}>
        <AnalyzeView />
      </Suspense>
    </AuthGate>
  );
}
