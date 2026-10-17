import Image from "next/image";
import Link from "next/link";
import LogoMark from "@/components/logo-mark";

import SimpleMarquee from "@/components/fancy/blocks/simple-marquee";
import HowItWorks from "@/components/how-it-works";
import SiteFooter from "@/components/site-footer";
import UrlForm from "@/components/url-form";

const PROTOCOLS = [
  { name: "Uniswap", slug: "uniswap" },
  { name: "Aave", slug: "aave" },
  { name: "Curve", slug: "curve" },
  { name: "Lido", slug: "lido" },
  { name: "Compound", slug: "compound" },
  { name: "Pendle", slug: "pendle" },
  { name: "GMX", slug: "gmx" },
  { name: "Morpho", slug: "morpho" },
  { name: "Jupiter", slug: "jupiter" },
  { name: "Raydium", slug: "raydium" },
];

export default function Home() {
  return (
    <main aria-label="Reverse Network" className="bg-white text-zinc-950">
      <section
        aria-labelledby="hero-heading"
        className="relative min-h-screen w-full overflow-hidden bg-white"
      >

        <nav
          aria-label="Main navigation"
          className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-10"
        >
          <Link
            href="/"
            aria-label="Reverse Network home"
            className="flex shrink-0 items-center gap-2.5 font-display text-base font-extrabold tracking-[-0.08em] [word-spacing:0.22em] min-[400px]:text-lg sm:gap-3 sm:text-2xl lg:text-3xl"
          >
            <LogoMark className="h-6 w-auto sm:h-7 lg:h-8" />
            REVERSE NETWORK
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-zinc-600 md:flex">
          
          </div>

          <Link
            href="/sign-in"
            className="rounded-full border-2 border-ink px-5 py-2.5 text-sm font-bold transition-colors hover:border-signal hover:bg-signal sm:px-6 sm:text-base"
          >
            Get started
          </Link>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 pb-16 pt-28 sm:px-10 lg:grid-cols-[1fr_1fr] lg:gap-4 lg:py-28">
          <div>
            <h1
              id="hero-heading"
              className="text-5xl font-semibold leading-[0.98] tracking-tighter sm:text-7xl xl:text-8xl"
            >
              Reverse engineer any web3 protocol
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
              Paste a web3 app URL. We map its contracts, you brand it and
              launch your own version.
            </p>
            <div id="start" className="mt-10 max-w-xl scroll-mt-32">
              <UrlForm />
            </div>
          </div>

          <Image
            src="/hero-watch.png"
            alt="Exploded technical drawing of a watch, showing its parts layer by layer"
            width={560}
            height={786}
            priority
            sizes="(min-width: 1280px) 640px, (min-width: 1024px) 50vw, 90vw"
            className="mx-auto h-auto w-72 mix-blend-multiply sm:w-96 lg:w-full lg:max-w-xl lg:justify-self-end xl:max-w-[640px]"
          />
        </div>
      </section>

      <section
        id="protocols"
        aria-label="Protocols you can reverse"
        className="relative scroll-mt-8 overflow-hidden py-10 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
      >
        <SimpleMarquee
          direction="left"
          baseVelocity={4}
          repeat={4}
          slowdownOnHover
          draggable
          grabCursor
          className="py-6"
        >
          {PROTOCOLS.map((protocol) => (
            <div
              key={protocol.slug}
              className="mx-4 h-20 w-20 shrink-0 overflow-hidden rounded-3xl transition-transform duration-300 ease-in-out hover:scale-125 sm:mx-5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/protocols/${protocol.slug}.webp`}
                alt={protocol.name}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </SimpleMarquee>
      </section>

      <section
        id="how"
        aria-labelledby="how-heading"
        className="mx-auto max-w-7xl scroll-mt-8 px-6 py-24 sm:px-10 sm:py-32"
      >
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-zinc-500">
          How it works
        </p>
        <h2
          id="how-heading"
          className="mt-4 max-w-2xl text-4xl font-semibold tracking-tighter sm:text-5xl"
        >
          From a URL to your own live protocol
        </h2>
        <HowItWorks />
      </section>

      <SiteFooter />
    </main>
  );
}
