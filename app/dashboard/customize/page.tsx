import { Suspense } from "react";
import type { Metadata } from "next";

import AuthGate from "@/components/dashboard/auth-gate";
import CustomizeView from "@/components/dashboard/customize-view";

export const metadata: Metadata = {
  title: "Customize | Reverse Network",
};

export default function CustomizePage() {
  return (
    <AuthGate>
      <Suspense fallback={<p role="status" className="text-zinc-500">Loading...</p>}>
        <CustomizeView />
      </Suspense>
    </AuthGate>
  );
}
