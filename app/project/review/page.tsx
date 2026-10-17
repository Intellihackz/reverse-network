import { Suspense } from "react";
import type { Metadata } from "next";

import AuthGate from "@/components/dashboard/auth-gate";
import ReviewBrand from "@/components/project/review-brand";
import StageFrame from "@/components/project/stage-frame";

export const metadata: Metadata = {
  title: "Review your brand | Reverse Network",
};

export default function ReviewPage() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <StageFrame>
            <p role="status">Loading...</p>
          </StageFrame>
        }
      >
        <ReviewBrand />
      </Suspense>
    </AuthGate>
  );
}
