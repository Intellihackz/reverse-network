# Reverse Network

Paste a web3 app URL. Reverse Network reads it, finds the contracts behind it, and gives you a branded app of your own that talks to those same contracts.

It does not copy the original app's screens. The app you download is a clean Next.js project with wallet connect and forms generated from each contract's ABI: read functions, write functions, nothing else.

## How it works

1. **Scan.** You paste a URL. The server fetches the page and its scripts, pulls out contract addresses, checks which ones are real contracts on five EVM chains (Ethereum, Base, Arbitrum, Optimism, Polygon), and loads verified ABIs from [Sourcify](https://sourcify.dev). It also reads the site's icon and drafts a plain summary of what the protocol does.
2. **Review.** You set a name, tagline, logo, colors, font, corners and networks. If the contracts already have fee, referral or payout inputs, those show up as settings you can prefill.
3. **Project.** Each project gets a page with a file explorer and editor for the generated app. Edits are saved to your account.
4. **Download.** You get a zip: a branded Next.js app that loads each contract's ABI at run time and lets visitors read and write through their own wallet.

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents`), React 19, Tailwind CSS 4
- [Privy](https://privy.io) for sign-in (email, Google, GitHub). The server verifies each token.
- [Neon](https://neon.tech) Postgres with [Drizzle](https://orm.drizzle.team) for saved projects
- `undici` with a guarded DNS lookup for fetching other people's sites
- Optional: the Anthropic API for richer summaries. Without a key a built-in rule-based summary is used.

## Run it locally

You need Node 20 or newer, a Privy app, and a Neon database.

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Your Privy app ID |
| `PRIVY_VERIFICATION_KEY` | The Privy verification key (PEM, copied exactly, including the line breaks) |
| `DATABASE_URL` | The Neon connection string |
| `ANTHROPIC_API_KEY` | Optional. Enables AI summaries |
| `ANALYZE_RATE_LIMIT` | Optional. Scans per person per window |

Create the table, then start the app:

```bash
npm run db:push
npm run dev
```

Open http://localhost:3000. In your Privy dashboard, add `http://localhost:3000` to the allowed origins.

The API only skips token checks in development when the verification key is unset. In production a missing key makes the server refuse every request.

## Deploy

Deploy to Vercel and set the same variables in the project settings. Then add the Vercel URL to your Privy app's allowed origins. Scans can run for up to two minutes, so check that your plan's function time limit allows it.

## Project layout

| Path | What is in it |
| --- | --- |
| `app/` | Routes. `/project/new`, `/project/analyze`, `/project/review` and `/project/[id]` are the project flow. `/api/analyze` streams a scan. `/api/projects/*` saves projects |
| `lib/analyzer/` | The scanner: safe fetching, address extraction, on-chain checks, Sourcify lookups, summaries |
| `lib/export/` | Generates the downloadable app and zips it in the browser |
| `lib/server/` | Auth, rate limiting, database schema and the project store |
| `components/project/` | The stage pages, brand review card and the project editor |

## Security notes

- Every project query is scoped to the verified Privy user ID. Nothing trusts an ID sent by the browser.
- The scanner fetches user-supplied URLs, so private and local network addresses are blocked at connection time, which also stops DNS rebinding.
- Unauthenticated requests to the API are refused.
- The downloaded app sends transactions only through the visitor's own wallet.

## Before you launch an app you generated

The contracts behind a protocol are public. Its name, logo, copy and code may not be. Check the original app's license and brand rules first, and review each write function before you expose it to other people. The generated app lists every function a contract has.

## Limits

- Only contracts with a verified ABI on Sourcify get working forms. For others you can paste an ABI by hand.
- Fee and referral settings are detected from function inputs by name. A fee only takes effect where the contract actually accepts one.
- The scanner finds addresses that appear in the app's scripts. Contracts created or chosen at run time will not show up.
