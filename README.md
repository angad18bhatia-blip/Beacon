# Beacon

A tool for high school and college students to reach out to professors
about research opportunities and mentorship: add the professors you want to contact,
generate a personalized draft for each one from your own profile,
review/edit it yourself, then send it from your own Gmail account — one
email per professor, always reviewed before it goes out, never a mass
blast.

## How it works

- **Sign in with Google.** This both logs you in and grants the app
  permission to send mail *as you* via the Gmail API (`gmail.send` scope),
  plus read-only inbox access (`gmail.readonly`) used only to detect
  replies in threads this app started. The app never sees or stores your
  password.
- **Add professors manually**, or import from **Discover** (see below).
- **Generate a draft** per professor from one of your saved prompts, then
  edit it by hand before approving.
- **Send** — each send is a distinct, idempotent API call. There's no
  BCC/mass-send; "send all approved" just loops the same single-send path
  professor by professor, and a soft daily cap (40/day) guards against the
  tool being used to spam.
- **Edit your profile anytime** — school, grade level, area of interest,
  and bio (used to personalize drafts) can be updated from Settings after
  the initial onboarding, not just once.

### AI features (all optional — the app works fine without any API keys, just with less automation)

- **Discover** searches a *pre-built, shared* database of researchers
  (`ResearcherDatabase`) instead of asking an AI to search live per query
  — free and instant to search, no per-query hallucination risk. The
  database itself is populated offline, once, by
  `scripts/build-researcher-db.ts` (`npm run db:build-researchers`),
  which loops over a list of `{university, department}` pairs, does a
  real Exa web search for each, and asks a free NVIDIA-hosted model
  (Llama 3.3 Nemotron Super 49B, via [build.nvidia.com](https://build.nvidia.com/))
  to extract *only* what's verifiable from those search results (never
  fabricated, marked `UNKNOWN`/`null` otherwise). Edit the `JOBS` list at
  the top of that script to control scope — NVIDIA's free tier is
  rate-limited rather than billed, so there's no dollar cost, but a huge
  list could still burn through the per-minute request quota; already-saved
  researchers are skipped on re-runs, so it's safe to extend the list and
  re-run later. Even so, this is AI-assembled data, not hand-verified —
  the UI reminds you to double-check before contacting anyone.
- **Saved prompts** (Settings) — keep multiple templates, mark one
  active, or pick a specific one per professor when generating a draft.
- **Prompt generator** (Settings) — describe what you want in plain
  English and a free NVIDIA-hosted model (Llama 3.1 8B Instruct) drafts a
  new saved prompt for you to review before saving. Rate-limited
  (3/day/user) to stay well within NVIDIA's shared free-tier quota.
- **"Ground with real research" drafts** (professor detail page) — writes
  a finished email instead of filling a template, using real research
  context: whatever Discover's database already has on that professor if
  they were imported from there, or a live Exa search otherwise. Either
  way, a free NVIDIA-hosted model (Llama 3.3 Nemotron Super 49B) writes
  the draft and returns the source links it used so you can verify them.
  Rate-limited (10/day/user), tracked separately from the prompt
  generator's limit.
- **Reply detection** — "Check for reply" (per professor) or "Check for
  replies" (dashboard, bulk) reads the Gmail thread the app sent and
  reports whether the professor has responded, with a snippet. On-demand
  only (no background job/cron in this app).
- **Dashboard** — a New → Drafted → Approved → Sent → Replied funnel (each
  tile links to that filtered slice of your professor list), reply rate
  per saved prompt, and the send actions themselves. Small sample sizes
  will be noisy; it's a signal, not a verdict.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Google Cloud OAuth client

The app needs its own Google OAuth client to request the `gmail.send`
and `gmail.readonly` scopes on your behalf. If you already have a client
from before reply-detection was added, no changes are needed on the
Google Cloud side — you'll just be prompted to re-consent (grant the new
read permission) the next time you sign in, since the scope the app
requests changed.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/),
   create a project (or pick an existing one).
2. **APIs & Services → Library** — enable the **Gmail API**.
3. **APIs & Services → OAuth consent screen** — configure it (External is
   fine for testing), and under **Test users**, add every Google account
   that should be able to sign in. While the app is unverified by Google,
   *only* accounts on this list can complete sign-in — see the caveat
   below.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   — type **Web application**. Add an authorized redirect URI:
   - `http://localhost:3000/api/auth/callback/google`
5. Copy the generated **Client ID** and **Client Secret**.

### 3. Configure environment variables

Copy `.env.example` to `.env` (a starter `.env` with the right shape
already exists) and fill in:

```bash
AUTH_SECRET=             # generate with: npx auth secret
AUTH_GOOGLE_ID=           # from step 2
AUTH_GOOGLE_SECRET=       # from step 2
NVIDIA_LLAMA_API_KEY=      # optional — free key from build.nvidia.com, enables the prompt generator
NVIDIA_NEMOTRON_API_KEY=   # optional — free key from build.nvidia.com, enables the Discover database builder script
EXA_API_KEY=                # optional — from exa.ai, enables the Discover database builder script
```

`DATABASE_URL` is already set to a local SQLite file — no extra setup
needed for local dev. The two NVIDIA keys are both free (no card, no
spend limit to set) — see "AI features" above for what each one powers
and its rate limit. Exa's free tier covers casual use of the Discover
builder; check their pricing if you extend the `JOBS` list a lot.

### 4. Set up the database

```bash
npx prisma migrate dev
```

### 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, complete
onboarding, add a professor, generate a draft, and send.

## Important: Google's OAuth verification

Google requires apps requesting sensitive scopes like `gmail.send` to go
through an **app verification / security assessment** before more than
~100 users can sign in. Until that's done, only the "test users" you list
on the OAuth consent screen can use the app. This is a real step outside
of writing code — it's a review process through Google's own console that
only the project owner can complete. Budget time for it before treating
this as launch-ready for a wide audience.

`gmail.readonly` (added for reply detection) is in Google's stricter
**"restricted scope"** tier, not just "sensitive" — going beyond your
test-user list with this scope requires an annual third-party security
assessment (real cost, real time), not just the standard verification
flow. For personal-only use (just your own account as a test user) none
of this applies; it only matters if you plan to open the app to students
beyond your test-user allowlist.

## Deploying to the web

SQLite (what you're using locally) won't work on most hosting platforms —
they don't give you a persistent disk to store the file on. So the one
required change is switching to a real hosted database; everything else
is standard Next.js deployment. Recommended path: **Vercel** (built by
the Next.js team, zero-config for this kind of app) + **Neon** (hosted
Postgres, generous free tier, minutes to set up).

### 1. Push this repo to GitHub

```bash
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

(Create the empty repo on [github.com/new](https://github.com/new) first,
don't initialize it with a README/license so it stays empty for this push.)

### 2. Create a hosted Postgres database

1. Go to [neon.tech](https://neon.tech) (or Supabase, Railway, etc.), sign
   up, and create a new project/database.
2. Copy the connection string it gives you — it'll look like
   `postgresql://user:password@host/dbname?sslmode=require`.

### 3. Switch the schema from SQLite to Postgres

In `prisma/schema.prisma`, change:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

to:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then, with `DATABASE_URL` in your **local** `.env` temporarily set to the
Neon connection string from step 2, run:

```bash
npx prisma migrate dev --name switch_to_postgres
```

This creates a fresh migration history against Postgres and applies it to
your new database. Commit the result (`prisma/schema.prisma` and the new
file under `prisma/migrations/`) and push it.

### 4. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new), sign in, and import the
   GitHub repo from step 1.
2. Under **Environment Variables**, add: `DATABASE_URL` (the Neon
   connection string), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
   and `NVIDIA_LLAMA_API_KEY`/`NVIDIA_NEMOTRON_API_KEY`/`EXA_API_KEY` if
   you're using the AI features (same values as your local `.env`).
3. Deploy. Vercel gives you a URL like `https://your-app.vercel.app`.

### 5. Point Google's OAuth client at the production URL

Back in [Google Cloud Console](https://console.cloud.google.com/) →
**APIs & Services → Credentials** → your OAuth client → **Authorized
redirect URIs**, add:

```
https://your-app.vercel.app/api/auth/callback/google
```

(Keep the `localhost:3000` one too if you still want to run it locally.)

### 6. Google's OAuth verification

This is the part that's genuinely outside of code and deploy steps: while
your app is unverified, **only the Google accounts you've explicitly
added as test users** (OAuth consent screen → Test users) can sign in —
capped at 100 users. To open it up to any student, you need to submit the
app for Google's **verification / security assessment** from the same
OAuth consent screen page. That's a review process on Google's end (can
take days to weeks) that only you, as the project owner, can kick off —
budget time for it before you count on this being usable by students who
aren't on your test-user list.
