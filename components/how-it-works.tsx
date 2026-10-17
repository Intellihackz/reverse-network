"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";

import GooeySvgFilter from "@/components/gooey-svg-filter";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Paste",
    body: "Drop in the URL of any web3 app. We detect the chain, the contracts and the frontend stack.",
    details: [
      "Detects the chain and network",
      "Finds the deployed contract addresses",
      "Fingerprints the frontend stack",
    ],
  },
  {
    title: "Reverse",
    body: "We map what the protocol actually does: its functions, fees and flows, in plain language.",
    details: [
      "Reads ABIs and emitted events",
      "Maps functions, fees and flows",
      "Explains each part in plain language",
    ],
  },
  {
    title: "Customize",
    body: "Change the brand, the fee recipient, the supported tokens and the copy. Preview it live.",
    details: [
      "Brand, theme and copy",
      "Fee recipient",
      "Supported tokens",
    ],
  },
  {
    title: "Deploy",
    body: "Ship your own version to a live URL, with the full repo in your hands.",
    details: [
      "Live URL in one click",
      "Full repo you own",
      "Redeploy whenever you change something",
    ],
  },
];

const noopSubscribe = () => () => {};

function useIsSafari() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    () => false,
  );
}

function useIsSmallScreen() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

const AUTO_SWITCH_MS = 5000;

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const isSafari = useIsSafari();
  const isSmall = useIsSmallScreen();
  const step = STEPS[active];

  // Depends on `active`, so a manual click restarts the countdown
  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = setTimeout(
      () => setActive((i) => (i + 1) % STEPS.length),
      AUTO_SWITCH_MS,
    );
    return () => clearTimeout(timer);
  }, [active, paused, reducedMotion]);

  return (
    <div
      className="relative mt-14 h-[calc(4rem+460px)] md:h-[calc(5rem+460px)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <GooeySvgFilter id="gooey-how" strength={isSmall ? 8 : 15} />

      <div
        className="absolute inset-0"
        style={{ filter: isSafari ? "none" : "url(#gooey-how)" }}
      >
        <div className="flex w-full">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative h-16 flex-1 md:h-20">
              {active === i && (
                <motion.div
                  layoutId="active-step"
                  className="absolute inset-0 bg-zinc-950"
                  transition={{
                    type: "spring",
                    bounce: 0,
                    duration: isSafari ? 0 : 0.4,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="h-[460px] w-full overflow-hidden bg-zinc-950">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={active}
              role="tabpanel"
              id={`how-panel-${active}`}
              aria-labelledby={`how-tab-${active}`}
              initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -50, filter: "blur(10px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="p-8 md:p-14"
            >
              <p className="font-mono text-base text-signal">
                {String(active + 1).padStart(2, "0")} / 04
              </p>
              <p className="mt-5 max-w-3xl text-2xl font-medium leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
                {step.body}
              </p>
              <ul className="mt-10 max-w-2xl text-white/75">
                {step.details.map((d) => (
                  <li
                    key={d}
                    className="border-b border-white/20 pb-2 pt-3 font-mono text-base md:text-lg"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Interactive labels sit outside the filter so the text stays sharp */}
      <div role="tablist" aria-label="How it works" className="relative flex w-full">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            id={`how-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`how-panel-${i}`}
            onClick={() => setActive(i)}
            className={cn(
              "flex h-16 flex-1 items-center justify-center text-base font-bold transition-colors md:h-20 md:text-xl",
              active === i ? "text-white" : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}
