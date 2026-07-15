# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Framework version warning

This repo is on **Next.js 16**, which is very new — APIs, conventions,
and file structure may differ from training data. Before writing
Next.js-specific code, check `node_modules/next/dist/docs/` for the
actual current behavior rather than assuming an older version's
conventions, and heed deprecation notices.

## What this is

Beacon: a Next.js app for high school students to reach out to professors
about research opportunities. A student signs in with Google, adds
professors manually, generates a personalized draft per professor from an
editable template, reviews/edits it, then sends it from their own Gmail
account via the Gmail API — one email per professor, never a mass-send.
See `README.md` for the full feature rundown and deployment walkthrough.

## Commands

```bash
npm run dev            # start dev server (Turbopack) on :3000
npm run build           # production build
npm run lint             # eslint (flat config via eslint.config.mjs)
npx tsc --noEmit -p tsconfig.json   # typecheck only, no test suite exists
npx prisma migrate dev --name <x>   # create + apply a migration after schema.prisma changes
npx prisma studio                    # browse the local sqlite db
```

There is no test suite in this repo — verification is `tsc` + `eslint` +
`next build`, plus manually exercising the flow in a browser.

### Local environment gotchas

- **Node isn't on PATH by default in some shells on this machine** — it
  was installed via nvm (not Homebrew, which needs admin rights this
  environment doesn't have). If `node`/`npm` aren't found, run:
  ```bash
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
  ```
  first, or use the full path
  `~/.nvm/versions/node/v24.18.0/bin/node`.
- **`DATABASE_URL` must be an absolute path**, not `file:./dev.db`.
  Prisma resolves relative sqlite paths differently for `prisma migrate`
  (relative to `prisma/schema.prisma`) vs. the running Next.js app
  (relative to the process cwd), which silently breaks at runtime with
  "unable to open the database file" if a relative path is used. See the
  comment in `.env.example`.
- If Turbopack's dev cache ever seems to be serving stale CSS/JS despite
  source changes (compiled chunk hash not updating), `rm -rf .next` and
  restart — this has happened once already in this repo's history.

## Architecture

**Stack**: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS
v4 + Prisma 6 (SQLite locally, swap to Postgres for prod — see README) +
Auth.js v5 (`next-auth@beta`) + `googleapis` for Gmail sending.

### Auth is also the mail-sending credential

`src/auth.ts` configures a single Google OAuth provider requesting
`openid email profile` **plus** `https://www.googleapis.com/auth/gmail.send`
in one scope string, with `access_type: offline` + `prompt: consent` so a
refresh token is always issued. There is no separate "connect Gmail" flow
— signing in *is* granting mail-send permission. Sessions use the
`"database"` strategy (via `@auth/prisma-adapter`), so `Account` rows
double as both the NextAuth account link and the OAuth token store used
later for sending.

`src/lib/gmail.ts` (`getGoogleClient`) reads the student's `Account` row,
refreshes the access token via `googleapis` if expired, and persists the
refreshed token back to the `Account` row. `src/lib/send-professor-email.ts`
(`sendProfessorEmail`) is the single choke point for actually sending: it
re-checks idempotency (`status !== 'SENT'`), enforces a daily per-user
send cap, builds a raw MIME message, and calls
`gmail.users.messages.send`. Both the single-send route
(`/api/professors/[id]/send`) and the bulk route
(`/api/professors/send-all`) call this same function — bulk send is just
a loop over it, never a BCC, so per-recipient idempotency and rate
limiting always apply.

### Prisma client generation is non-standard

`prisma/schema.prisma` uses `generator client { provider = "prisma-client" }`
(the newer TS-first generator, not the classic `prisma-client-js`),
outputting to `src/generated/prisma/` (gitignored, run `npx prisma
generate` after cloning). Consequences that differ from typical Prisma
codebases:
- Model types are named `<Model>Model` (e.g. `ProfessorModel`), imported
  from `@/generated/prisma/models` — not the bare `Professor` you'd
  expect from `@prisma/client`.
- Import the client itself from `@/generated/prisma/client`.
- `src/lib/prisma.ts` holds the standard dev-mode singleton pattern
  against this generated client.

Prisma is pinned to `^6` in `package.json` (not the newer major) —
intentional, to stay on the well-documented classic-engine behavior
rather than v7's driver-adapter requirements.

### Professor lifecycle is one linear status machine

`ProfessorStatus`: `NEW → DRAFTED → APPROVED → SENT`. All server-side
mutations that change status live behind three routes:
- `POST /api/professors/[id]/draft` — renders the user's `EmailTemplate`
  against merge fields (student profile + professor fields, see
  `src/lib/template.ts`) into `draftSubject`/`draftBody`, sets `DRAFTED`.
- `PATCH /api/professors/[id]` — edits fields/draft text, explicitly
  refuses to set `status: SENT` (that's only reachable through `/send`)
  and refuses any edit once a professor is `SENT`.
- `POST /api/professors/[id]/send` — the only path to `SENT`, via
  `sendProfessorEmail`.

UI-side, `src/app/professors/[id]/professor-detail.tsx` is a single
client component owning all of generate/edit/approve/send/delete for one
professor — it's intentionally not split further since the state
(subject/body/status/dirty-tracking) is tightly coupled.

### Onboarding fields double as both first-run and editable profile

`POST /api/onboarding` sets `User.school/degreeLevel/areaOfStudy/bio` and
flips `onboarded = true`; it's reused verbatim by both the first-run
onboarding form (`src/app/onboarding/`) and the "edit anytime" profile
form in Settings (`src/app/settings/profile-form.tsx`) — same endpoint,
same shape, just called from two different UIs. Every page other than
`/onboarding` itself server-side-redirects to `/onboarding` if
`!session.user.onboarded`, and to `/` if unauthenticated.

### Theming

`src/app/globals.css` defines the whole palette as CSS custom properties
(`--accent`, `--accent2`, `--pink`, `--teal`, `--amber`, `--danger`, each
with a `-soft`/`-hover` variant) with light values in `:root` and dark
overrides under `@media (prefers-color-scheme: dark)` — there's no
manual dark-mode toggle, it follows the OS. These are re-exposed as
Tailwind utilities via `@theme inline` (e.g. `--color-accent` →
`bg-accent`/`text-accent`), so components mostly use Tailwind classes,
falling back to inline `style={{ color: "var(--x)" }}` only where a
gradient or a dynamically-chosen color (see `src/lib/avatar-color.ts`,
which deterministically hashes a professor's name to a palette color for
their avatar) is needed. The `.page-glow` utility class puts a soft
multi-color radial-gradient blur behind a page's header; most top-level
pages use it.

### What's deliberately not here

Professor discovery is 100% manual entry — an AI web-search-assisted
discovery feature (Anthropic API + risk-acknowledgment gate) was built
and then removed at the user's request (cost concerns), including a full
schema revert via migration. If asked to rebuild it, the relevant design
constraints (from the prior implementation) were: never auto-send
anything found this way, require an explicit per-user risk
acknowledgment before first use, rate-limit searches separately from
sends, and never fabricate an email address — only report one actually
found via search.
