"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLogout, usePrivy } from "@privy-io/react-auth";
import LogoMark from "@/components/logo-mark";

import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Pages that don't exist yet render as disabled */
  soon?: boolean;
}

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "h-5 w-5 shrink-0 fill-none stroke-current stroke-2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const NAV: NavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    label: "Protocols",
    href: "/dashboard/protocols",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <path d="M12 3 3 8l9 5 9-5-9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </svg>
    ),
  },
  {
    label: "Deployments",
    href: "/dashboard/deployments",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <path d="M12 3c3 2 5 5 5 9l-2 4H9l-2-4c0-4 2-7 5-9Z" />
        <path d="M9 16v3m6-3v3" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    soon: true,
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
];

function Logo() {
  return (
    <Link
      href="/"
      aria-label="Reverse Network home"
      className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-[-0.08em] [word-spacing:0.22em]"
    >
      <LogoMark className="h-6 w-auto" />
      REVERSE NETWORK
    </Link>
  );
}

interface SidebarProps {
  identity: string | null;
  pathname: string;
  signOutFailed: boolean;
  onNavigate: () => void;
  onSignOut: () => void;
}

function SidebarContent({
  identity,
  pathname,
  signOutFailed,
  onNavigate,
  onSignOut,
}: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        <Logo />
      </div>

      <nav aria-label="Dashboard" className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const base =
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold";

            return (
              <li key={item.label}>
                {item.soon ? (
                  <span
                    aria-disabled="true"
                    className={cn(base, "cursor-not-allowed text-zinc-400")}
                  >
                    {item.icon}
                    {item.label}
                    <span className="ml-auto rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                      Soon
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      base,
                      "transition-colors",
                      active
                        ? "bg-zinc-950 text-white"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {identity && (
        <div className="border-t border-zinc-200 p-4">
          <div className="flex items-center gap-3 px-2 pb-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-bold uppercase text-white"
            >
              {identity.replace(/^@/, "").charAt(0) || "?"}
            </span>
            <p className="min-w-0 truncate text-sm font-medium text-zinc-700">
              {identity}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-full border-2 border-zinc-950 px-5 py-2 text-sm font-bold transition-colors hover:bg-zinc-950/5"
          >
            Sign out
          </button>
          {signOutFailed && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              We couldn&apos;t sign you out. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface ShellViewProps {
  identity: string | null;
  signOutFailed: boolean;
  onSignOut: () => void;
  children: React.ReactNode;
}

// Layout only, no auth, so it can be rendered on its own
export function ShellView({
  identity,
  signOutFailed,
  onSignOut,
  children,
}: ShellViewProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const sidebar = (
    <SidebarContent
      identity={identity}
      pathname={pathname}
      signOutFailed={signOutFailed}
      onNavigate={() => setDrawerOpen(false)}
      onSignOut={onSignOut}
    />
  );

  return (
    <div className="min-h-screen bg-white text-zinc-950 md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-zinc-200 bg-white md:block">
        {sidebar}
      </aside>

      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 md:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 fill-none stroke-current stroke-2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-zinc-950/40"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl"
          >
            {sidebar}
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-col px-6 py-8 sm:px-10 md:px-12 md:pb-12 md:pt-7">
        {children}
      </main>
    </div>
  );
}

const SigningOutContext = createContext<React.RefObject<boolean> | null>(null);

/** True while a sign-out is in flight, so page guards don't redirect to sign-in mid-logout */
export function useSigningOut() {
  return useContext(SigningOutContext);
}

function ConnectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { ready, authenticated, user } = usePrivy();
  const { logout } = useLogout();
  const signingOut = useRef(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function handleSignOut() {
    signingOut.current = true;
    setSignOutFailed(false);
    try {
      await logout();
      router.replace("/");
    } catch {
      signingOut.current = false;
      setSignOutFailed(true);
    }
  }

  const identity =
    ready && authenticated && user
      ? (user.email?.address ??
        user.google?.email ??
        (user.github?.username ? `@${user.github.username}` : "Signed in"))
      : null;

  return (
    <SigningOutContext.Provider value={signingOut}>
      <ShellView
        identity={identity}
        signOutFailed={signOutFailed}
        onSignOut={handleSignOut}
      >
        {children}
      </ShellView>
    </SigningOutContext.Provider>
  );
}

// Always renders {children}; the sign-in check lives in AuthGate inside each page
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <ShellView identity={null} signOutFailed={false} onSignOut={() => {}}>
        {children}
      </ShellView>
    );
  }
  return <ConnectedShell>{children}</ConnectedShell>;
}
