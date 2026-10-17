import type { Metadata } from "next";

import AuthGate from "@/components/dashboard/auth-gate";
import NewProjectStage from "@/components/project/new-project-stage";

export const metadata: Metadata = {
  title: "New project | Reverse Network",
};

export default function NewProjectPage() {
  return (
    <AuthGate>
      <NewProjectStage />
    </AuthGate>
  );
}
