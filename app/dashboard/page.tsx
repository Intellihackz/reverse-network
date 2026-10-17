import type { Metadata } from "next";

import AuthGate from "@/components/dashboard/auth-gate";
import DashboardHome from "@/components/dashboard/dashboard-home";

export const metadata: Metadata = {
  title: "Dashboard | Reverse Network",
};

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardHome />
    </AuthGate>
  );
}
