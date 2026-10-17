import { Suspense } from "react";
import type { Metadata } from "next";

import AuthGate from "@/components/dashboard/auth-gate";
import ProjectWorkspace from "@/components/project/project-workspace";

export const metadata: Metadata = {
  title: "Project | Reverse Network",
};

export default function ProjectPage() {
  return (
    <AuthGate>
      <Suspense fallback={<p role="status" className="p-8 text-zinc-500">Loading...</p>}>
        <ProjectWorkspace />
      </Suspense>
    </AuthGate>
  );
}
