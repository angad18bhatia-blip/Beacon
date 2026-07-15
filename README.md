# Research Outreach

A tool for students to reach out to professors about research positions:
add the professors you want to contact, generate a personalized draft for
each one from your own profile, review/edit it yourself, then send it from
your own Gmail account — one email per professor, always reviewed before
it goes out, never a mass blast.

## How it works

- **Sign in with Google.** This both logs you in and grants the app
  permission to send mail *as you* via the Gmail API (`gmail.send` scope).
  The app never sees or stores your password.
- **Add professors manually** — name, email, school, department, research
  area. There's no scraping or auto-search; you bring the list.
- **Generate a draft** per professor from an editable template, then edit
  it by hand before approving.
- **Send** — each send is a distinct, idempotent API call. There's no
  BCC/mass-send; "send all approved" just loops the same single-send path
  professor by professor, and a soft daily cap (40/day) guards against the
  tool being used to spam.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Google Cloud OAuth client

The app needs its own Google OAuth client to request the `gmail.send`
scope on your behalf.

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
AUTH_SECRET=        # generate with: npx auth secret
AUTH_GOOGLE_ID=      # from step 2
AUTH_GOOGLE_SECRET=  # from step 2
```

`DATABASE_URL` is already set to a local SQLite file — no extra setup
needed for local dev.

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

## Moving to production

- Swap `DATABASE_URL` to a hosted Postgres instance (e.g. Neon, Supabase)
  and change the `datasource` provider in `prisma/schema.prisma` from
  `sqlite` to `postgresql`, then re-run `prisma migrate dev` once against
  the new database to generate a fresh migration history.
- Deploy (e.g. to Vercel), set the same environment variables there, and
  add the production callback URL
  (`https://yourdomain.com/api/auth/callback/google`) to the Google OAuth
  client's authorized redirect URIs.
- Complete Google's OAuth verification (see above) once you're ready for
  real users beyond your test-user allowlist.
