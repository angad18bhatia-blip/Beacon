# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Framework version warning

This repo is on **Next.js 16**, which is very new — APIs, conventions,
and file structure may differ from training data. Before writing
Next.js-specific code, check `node_modules/next/dist/docs/` for the
actual current behavior rather than assuming an older version's
conventions, and heed deprecation notices.

## What this is

Beacon: a Next.js app for high school and college students to reach out to
professors about research opportunities. A student signs in with Google, adds
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
npm run db:build-researchers    # AI-populates ResearcherDatabase via Exa+NVIDIA Nemotron (needs both API keys, both free — see README)
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
Auth.js v5 (`next-auth@beta`) + `googleapis` for Gmail + NVIDIA's free NIM
API (`src/lib/nvidia.ts`, via plain `fetch`, no SDK — OpenAI-compatible
chat completions at `https://integrate.api.nvidia.com/v1`) for LLM calls
+ Exa's REST search API (via plain `fetch`, no SDK) for web search.

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
`SENT` professor with a `threadId`, used by the dashboard's "Check for
replies" button) — there is no cron/background job/webhook in this app.
Both routes detect a Gmail permission error (thrown when an account
signed in before this scope existed hasn't re-consented) and surface a
"sign out and back in" message rather than a raw error. (A notification
bell that auto-triggered this on every page load was built and then
removed — see git history if reviving it.)

### Dashboard tiles drill into a filtered professor list

`/dashboard` used to be split from `/stats` — same funnel tiles (New /
Drafted / Approved / Sent / Replied) computed from the same `Professor`
query, just rendered on two separate pages. They were merged into one
`/dashboard` page since the duplication wasn't earning its keep; `/stats`
now just `redirect()`s to `/dashboard` so old links don't 404. The status
tiles are links, not just numbers — clicking one goes to
`/professors?status=<STATUS>` or `/professors?replied=1`, which
`src/app/professors/page.tsx` reads to filter the same list view down to
just that group (with a "Clear filter" link back to the unfiltered list).

Below the tiles, `/dashboard` also groups `Professor` rows by
`templateNameUsed` among `status: SENT` ones, computing sent/replied/
reply-rate per saved prompt ("Which prompts are working") — this and the
send-actions table (`dashboard-table.tsx`) are the two things that used
to live on the separate `/stats` page. Pure read/aggregate, no new state.

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
- `POST /api/professors/[id]/draft-ai` — the "grounded" alternative,
  writes an actual finished email (no merge-field placeholders) instead
  of filling a template. Tries two sources of "verified context about
  the professor," in order, and uses whichever it finds first:
  1. If the professor was imported from Discover (`Professor.importedFromDbId`
     set) and that `ResearcherDatabase` row has `researchSummary` or
     `recentProjects`, use that directly — free, instant, no live call.
  2. Otherwise, a live Exa search (`${name} ${school} research`). Needs
     `EXA_API_KEY`.
  Either way, the context + the chosen template's tone go to NVIDIA's
  `nvidia/llama-3.3-nemotron-super-49b-v1` (same "never fabricate, keep
  it general instead of guessing" instruction pattern as the Discover
  builder) which returns the finished subject/body plus the source
  URLs it drew on (shown in the UI so the student can double-check them).
  Sets `Professor.templateNameUsed` to `"<template name> (AI-grounded)"`
  so `/dashboard`'s per-prompt table can compare grounded vs.
  template-only reply rates as separate rows. Rate-limited independently
  of the prompt generator via
  `User.aiDraftCount`/`aiDraftCountDate` (10/day) — kept separate from
  `promptGenCount` (3/day) since drafting several professors in one
  sitting is a normal use pattern that shouldn't eat into the prompt
  generator's budget.
- `PATCH /api/professors/[id]` — edits fields/draft text; refuses to set
  `status: SENT` (only reachable through `/send`) and refuses edits once
  `SENT`.
- `POST /api/professors/[id]/send` — the only path to `SENT`.

UI-side, `src/app/professors/[id]/professor-detail.tsx` is one client
component owning generate / AI-generate / edit / approve / send / delete
/ check-reply for a single professor — intentionally not split further
since the state is tightly coupled.

Note: the Settings "generate a saved prompt with AI" flow
(`/api/templates/generate`) and the AI-grounded draft mode above were
both removed earlier (cost/complexity, when the only option was the paid
Anthropic API), then brought back once AI calls moved to NVIDIA's free
API — see "AI features now run on NVIDIA's free API" below.

### Multiple saved prompts, not one template

`EmailTemplate` supports many rows per user; exactly one has
`isDefault: true` ("active"). CRUD lives at `/api/templates` (list/create)
and `/api/templates/[id]` (PATCH supports a `setActive: true` body flag
that atomically flips every other template's `isDefault` off in a
transaction; DELETE refuses to drop the last remaining template and
auto-promotes another to active if the deleted one was active).
`src/app/settings/template-manager.tsx` is the CRUD UI. The generate call
in `professor-detail.tsx` lets the user pick which saved template to use
via a `<select>`.

### Onboarding fields double as both first-run and editable profile

`POST /api/onboarding` sets `User.school/degreeLevel/areaOfStudy/bio` and
flips `onboarded = true`; reused verbatim by both the first-run
onboarding form and the "edit anytime" profile form in Settings
(`src/app/settings/profile-form.tsx`). Every page other than
`/onboarding` redirects there if `!session.user.onboarded`, and to `/` if
unauthenticated.

`degreeLevel` is a free-text `User` column but both forms constrain it to
a fixed `<select>` list — high school (`"9th Grader"` … `"12th Grader"`)
and college (`"College Freshman"` … `"College Senior"`) in two
`<optgroup>`s. `src/lib/template.ts`'s `getCapabilityNote()` pattern-matches
on that exact label format (`/grader$/i` = high school, anything else =
college) to pick which version of the "what I'm asking for" sentence goes
into the `{{capability_note}}` merge field — a high schooler asks to
shadow/learn in a small capacity, a college student is told it's
reasonable to ask about actual RA positions. This is the one piece of
template content that adapts to degree level; if the option label format
ever changes, that regex needs to change with it. The same note (computed
fresh, not the raw template) is injected into the AI-grounded draft
prompt (`draft-ai/route.ts`) too, so both drafting paths adapt.

### Discover: a pre-built shared database, not live search

`ResearcherDatabase` is a **shared, not per-user** table. The whole point
is that searching it (`/discover`) is free and has no live hallucination
risk, unlike the original (removed, then rebuilt) design where each user
query hit an LLM directly. The search box matches across name,
university, department, `fieldOfResearch`, and `researchSummary` (an
`OR` of `contains` filters, built once in `src/lib/discover-search.ts`
and shared by the page and `/api/discover` so the two can't drift) — an
earlier version searched `fieldOfResearch` only, which made obvious
queries like a university name return nothing. Results are paginated 15
at a time (`DISCOVER_PAGE_SIZE`); `discover-results.tsx` is a client
component that starts from the server-rendered first page and appends
more via `GET /api/discover?q=...&skip=...` when "Show more" is clicked.
It gets populated two ways:
- `scripts/build-researcher-db.ts` (`npm run db:build-researchers`) —
  loops a hardcoded `JOBS` list of `{university, department}` pairs
  (deliberately spread across fields — CS, Biology, Physics, Chemistry,
  Math, Psychology, Aerospace, Astronomy, Neuroscience, etc. — and
  several universities, not just MIT/Stanford, so Discover isn't
  CS/Bio-only; edit the list to expand further), does a real Exa search
  per department, then asks NVIDIA's free
  `llama-3.3-nemotron-super-49b-v1` to extract *only* what's verifiable
  from those specific search results (never fabricate; `null`/`"UNKNOWN"`
  otherwise) as JSON, and upserts. Needs both `NVIDIA_NEMOTRON_API_KEY`
  and `EXA_API_KEY`.
- `scripts/seed-researchers.ts` — a one-off hand-editable list for
  manually-verified entries (e.g. researched by the user directly, or via
  a separate chat) with **no API calls at all**. Both scripts skip a row
  if a `(name, university, department)` match already exists, so
  re-running either is always safe.

`ResearcherDatabase` also carries optional "fit for a high schooler"
fields that aren't computed by this app — `title`, `recentProjects`,
`highSchoolFriendliness`, `undergradMentoring`, `outreachScore` (1-10),
`responseProbability`, `notes` — populated only when the source data
included them (the builder script's model output generally won't;
manually-researched entries like the current seed data often do).
`src/app/discover/discover-results.tsx` renders these as badges when
present.

Importing a result into a user's own `Professor` list
(`source: "database"`, `importedFromDbId` set) still requires the row to
have a non-null `email` — no email means the checkbox is disabled, can't
be imported (the UI nudges the student to go find one themselves rather
than just saying import failed). A permanent (not one-time-dismissed)
banner on `/discover`
reminds the student to verify before contacting, since "AI-assembled" and
"AI-generated draft, unreviewed" and "hand-verified" are all different
things and this database is a mix.

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
- All three AI-adjacent keys are configured and live: `EXA_API_KEY`,
  `NVIDIA_NEMOTRON_API_KEY` (Discover builder + AI-grounded drafts), and
  `NVIDIA_LLAMA_API_KEY` (prompt generator) — all three are free-tier
  keys from build.nvidia.com / exa.ai, not paid, so there's no cost
  gating to worry about here unlike the old Anthropic setup. All three
  AI features (Discover builder, prompt generator, AI-grounded drafting)
  are now live and have been used for real, not just built-but-inert.
- `ResearcherDatabase` currently has 66 entries across 12 universities
  (50 with a real email on file): the hand-verified ones from
  `scripts/seed-researchers.ts` (editing that file's `ENTRIES` array is
  the pattern for adding more without API calls) plus two
  `npm run db:build-researchers` runs — the original small MIT/Stanford
  CS+Biology `JOBS` list, then an expanded one spanning Physics,
  Chemistry, Math, Psychology, Aerospace, Astronomy, and Neuroscience
  across MIT, Stanford, Berkeley, Caltech, Michigan, Georgia Tech,
  Princeton, Harvard, and UCLA. Two department jobs (Princeton Math,
  Cornell Astronomy) extracted 0 researchers on that run — Nemotron
  correctly abstained rather than fabricating when its search results
  weren't rich enough, not a bug.
- The user's own `Professor` list has real (not just test) outreach data
  in it now, including at least one sent email with a detected reply.
- Google OAuth: personal test-user only, not submitted for verification.
