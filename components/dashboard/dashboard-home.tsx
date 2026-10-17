"use client";

import { usePrivy } from "@privy-io/react-auth";

import NewReverseForm from "@/components/dashboard/new-reverse-form";
import ProjectList from "@/components/dashboard/project-list";

export default function DashboardHome() {
  const { user } = usePrivy();

  return (
    <div className="flex w-full flex-1 flex-col">
      <h1 className="text-6xl font-semibold leading-[0.95] tracking-tighter sm:text-7xl xl:text-8xl">
        Your workspace
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-zinc-600 sm:text-xl">
        Every protocol you reverse, customize and deploy lives here.
      </p>

      <NewReverseForm />

      <section
        aria-labelledby="projects-heading"
        className="mt-12 flex flex-1 flex-col"
      >
        <h2
          id="projects-heading"
          className="font-mono text-sm uppercase tracking-[0.2em] text-zinc-500"
        >
          Your protocols
        </h2>
        <ProjectList userId={user?.id ?? ""} />
      </section>
    </div>
  );
}
