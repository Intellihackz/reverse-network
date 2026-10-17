import { Suspense } from "react";
import type { Metadata } from "next";

import AnalyzeView from "@/components/dashboard/analyze-view";
import AuthGate from "@/components/dashboard/auth-gate";
import StageFrame from "@/components/project/stage-frame";

export const metadata: Metadata = {
  title: "Reversing | Reverse Network",
};

export default function AnalyzePage() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <StageFrame>
            <p role="status">Loading...</p>
          </StageFrame>
        }
      >
        <AnalyzeView />
      </Suspense>
    </AuthGate>
  );
}
