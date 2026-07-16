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
professors (manually or via Discover), generates a personalized draft per
professor from a saved prompt/template, reviews/edits it, then sends it
from their own Gmail account — one email per professor, never a
mass-send. It can also detect replies and show per-prompt reply-rate
stats. See `README.md` for the full feature rundown and deployment
walkthrough.

## Commands

```bash
npm run dev                    # start dev server (Turbopack) on :3000
npm run build                   # production build
npm run lint                     # eslint (flat config via eslint.config.mjs)
npx tsc --noEmit -p tsconfig.json       # typecheck only, no test suite exists
npx prisma migrate dev --name <x>       # create + apply a migration after schema.prisma changes
npx prisma studio                        # browse the local sqlite db
npm run db:build-researchers    # AI-populates ResearcherDatabase via Exa+Claude (needs both API keys, costs money — see README)
npx tsx scripts/seed-researchers.ts     # one-off: hand-written/manually-verified researcher entries, no API calls
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
  restart — this has happened before in this repo's history.
- Restarting the dev server invalidates the current browser session/tab
  (has happened repeatedly in this environment) — expect to need to sign
  in again after any server restart when testing manually.

## Architecture

**Stack**: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS
v4 + Prisma 6 (SQLite locally, swap to Postgres for prod — see README) +
Auth.js v5 (`next-auth@beta`) + `googleapis` for Gmail + `@anthropic-ai/sdk`
for Claude + Exa's REST search API (via plain `fetch`, no SDK) for web
search.

### Auth is also the mail-sending *and* inbox-reading credential

`src/auth.ts` requests `openid email profile` **plus**
`https://www.googleapis.com/auth/gmail.send` **plus**
`https://www.googleapis.com/auth/gmail.readonly` in one scope string, with
`access_type: offline` + `prompt: consent` so a refresh token is always
issued. There is no separate "connect Gmail" flow — signing in *is*
granting both send and read-only inbox permission (the latter is used
only to detect replies in threads this app itself started). `gmail.readonly`
is one of Google's stricter **"restricted scopes"** — fine for personal/
test-user use, but going beyond ~100 test users requires an annual
third-party security assessment, not just standard verification (see
README). Sessions use the `"database"` strategy (`@auth/prisma-adapter`),
so `Account` rows double as the OAuth token store used for both sending
and reading.

`src/lib/gmail.ts` exports `getGoogleClient` (token refresh/persistence),
`sendGmail`, and `checkForReply` (reads a thread by `threadId` via
`gmail.users.threads.get`, looks for any message not `From` the student's
own address). `src/lib/send-professor-email.ts` (`sendProfessorEmail`) is
the single choke point for sending: idempotency check, daily send cap,
MIME build, and now also captures `sendResult.threadId` onto the
`Professor` row for later reply checks. Both the single-send route and
the bulk route (`/api/professors/send-all`) call this same function.

Reply checking is **on-demand only** — `POST /api/professors/[id]/check-reply`
(single) and `POST /api/professors/check-replies` (bulk, loops every
`SENT` professor with a `threadId`) — there is no cron/background job/
webhook in this app. Both routes detect a Gmail permission error (thrown
when an account signed in before this scope existed hasn't re-consented)
and surface a "sign out and back in" message rather than a raw error.

### Prisma client generation is non-standard

`prisma/schema.prisma` uses `generator client { provider = "prisma-client" }`
(the newer TS-first generator, not the classic `prisma-client-js`),
outputting to `src/generated/prisma/` (gitignored, run `npx prisma
generate` after cloning). Consequences that differ from typical Prisma
codebases:
- Model types are named `<Model>Model` (e.g. `ProfessorModel`,
  `EmailTemplateModel`, `ResearcherDatabaseModel`), imported from
  `@/generated/prisma/models` — not the bare model name you'd expect from
  `@prisma/client`.
- Import the client itself from `@/generated/prisma/client`.
- `src/lib/prisma.ts` holds the standard dev-mode singleton pattern.

Prisma is pinned to `^6` in `package.json` (not the newer major) —
intentional, to stay on the well-documented classic-engine behavior
rather than v7's driver-adapter requirements.

### Professor lifecycle is one linear status machine

`ProfessorStatus`: `NEW → DRAFTED → APPROVED → SENT`. Server-side status
mutations live behind:
- `POST /api/professors/[id]/draft` — plain merge-field substitution
  (`src/lib/template.ts`) using either the explicit `templateId` in the
  request body or the user's active (`isDefault: true`) `EmailTemplate`;
  snapshots the template's *name* onto `Professor.templateNameUsed` (used
  by the stats page — survives the template later being edited/deleted).
- `POST /api/professors/[id]/draft-ai` — the "grounded" alternative: runs
  an Exa search on the specific professor, feeds the results + the
  chosen template's tone into Claude, asks for a draft that cites
  something real (never fabricated) with source URLs returned to the
  client. Shares the same daily budget/counter as the prompt generator
  (`User.promptGenCount`).
- `PATCH /api/professors/[id]` — edits fields/draft text; refuses to set
  `status: SENT` (only reachable through `/send`) and refuses edits once
  `SENT`.
- `POST /api/professors/[id]/send` — the only path to `SENT`.

UI-side, `src/app/professors/[id]/professor-detail.tsx` is one client
component owning generate / AI-generate / edit / approve / send / delete
/ check-reply for a single professor — intentionally not split further
since the state is tightly coupled.

### Multiple saved prompts, not one template

`EmailTemplate` supports many rows per user; exactly one has
`isDefault: true` ("active"). CRUD lives at `/api/templates` (list/create)
and `/api/templates/[id]` (PATCH supports a `setActive: true` body flag
that atomically flips every other template's `isDefault` off in a
transaction; DELETE refuses to drop the last remaining template and
auto-promotes another to active if the deleted one was active).
`src/app/settings/template-manager.tsx` is the CRUD UI;
`src/app/settings/prompt-generator.tsx` is the "describe it, Claude
writes it" flow (`POST /api/templates/generate`, rate-limited, returns a
draft for review — nothing is saved until the user clicks Save). Every
generate/draft-ai call in `professor-detail.tsx` lets the user pick which
saved template to use via a `<select>`.

### Onboarding fields double as both first-run and editable profile

`POST /api/onboarding` sets `User.school/degreeLevel/areaOfStudy/bio` and
flips `onboarded = true`; reused verbatim by both the first-run
onboarding form and the "edit anytime" profile form in Settings
(`src/app/settings/profile-form.tsx`). Every page other than
`/onboarding` redirects there if `!session.user.onboarded`, and to `/` if
unauthenticated.

### Discover: a pre-built shared database, not live search

`ResearcherDatabase` is a **shared, not per-user** table. The whole point
is that searching it (`/discover`, plain Prisma `contains` filters) is
free and has no live hallucination risk, unlike the original (removed,
then rebuilt) design where each user query hit an LLM directly. It gets
populated two ways:
- `scripts/build-researcher-db.ts` (`npm run db:build-researchers`) —
  loops a hardcoded `JOBS` list of `{university, department}` pairs
  (intentionally small/pilot-scoped — edit the list to expand), does a
  real Exa search per department, then asks Claude to extract *only*
  what's verifiable from those specific search results (never fabricate;
  `null`/`"UNKNOWN"` otherwise) as JSON, and upserts. Needs both
  `ANTHROPIC_API_KEY` and `EXA_API_KEY`.
- `scripts/seed-researchers.ts` — a one-off hand-editable list for
  manually-verified entries (e.g. researched by the user directly, or via
  a separate chat) with **no API calls at all**. This is how the current
  12 seeded entries got in. Both scripts skip a row if a
  `(name, university, department)` match already exists, so re-running
  is always safe.

`ResearcherDatabase` also carries optional "fit for a high schooler"
fields that aren't computed by this app — `title`, `recentProjects`,
`highSchoolFriendliness`, `undergradMentoring`, `outreachScore` (1-10),
`responseProbability`, `notes` — populated only when the source data
included them (Claude output from the builder script generally won't;
manually-researched entries like the current seed data often do).
`src/app/discover/discover-results.tsx` renders these as badges when
present.

Importing a result into a user's own `Professor` list
(`source: "database"`, `importedFromDbId` set) still requires the row to
have a non-null `email` — no email means the checkbox is disabled, can't
be imported. A permanent (not one-time-dismissed) banner on `/discover`
reminds the student to verify before contacting, since "AI-assembled" and
"AI-generated draft, unreviewed" and "hand-verified" are all different
things and this database is a mix.

### Stats

`/stats` groups `Professor` rows by `templateNameUsed` among `status:
SENT` ones, computing sent/replied/reply-rate per saved prompt, plus an
overall New→Drafted→Approved→Sent→Replied funnel. Pure read/aggregate,
no new state.

### Theming

`src/app/globals.css` defines the whole palette as CSS custom properties
(`--accent`, `--accent2`, `--pink`, `--teal`, `--amber`, `--danger`, each
with a `-soft`/`-hover` variant) with light values in `:root` and dark
overrides under `@media (prefers-color-scheme: dark)` — no manual
dark-mode toggle, it follows the OS. Re-exposed as Tailwind utilities via
`@theme inline` (`--color-accent` → `bg-accent`/`text-accent`), so
components mostly use Tailwind classes, falling back to inline
`style={{ color: "var(--x)" }}` for gradients or dynamically-chosen
colors (`src/lib/avatar-color.ts` deterministically hashes a name to a
palette color for avatar initials). The `.page-glow` utility puts a soft
multi-color radial-gradient blur behind a page header; most top-level
pages use it.

## Current session state (as of the last working session)

Not architecture, just where things stand — check `git log` / `.env` for
ground truth if this goes stale:
- `EXA_API_KEY` is configured; `ANTHROPIC_API_KEY` is deliberately **not**
  set (user's choice, to avoid cost) — so the prompt generator, AI-grounded
  drafts, and `npm run db:build-researchers` are all live-but-inert until
  a key is added. Nothing breaks; each route checks for the key and
  returns a clear "not configured" error.
- `ResearcherDatabase` currently has 12 hand-verified entries (seeded via
  `scripts/seed-researchers.ts`, editing that file's `ENTRIES` array is
  the pattern for adding more without API calls).
- The user's own `Professor` list is empty at the moment (test data was
  cleaned up).
- Google OAuth: personal test-user only, not submitted for verification.
