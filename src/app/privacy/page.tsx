import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Beacon",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated: July 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300">
        <p>
          Beacon (&ldquo;the app,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is
          a tool that helps students draft and send research-outreach emails
          to professors from their own Gmail account. This page explains what
          data we collect, why, and how it&apos;s used.
        </p>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            What we collect
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Your Google profile</strong> — name, email address, and
              profile picture, when you sign in with Google.
            </li>
            <li>
              <strong>OAuth tokens</strong> — used to send email on your
              behalf and to check for replies. We never see or store your
              Google password; sign-in happens entirely through Google&apos;s
              own sign-in page.
            </li>
            <li>
              <strong>Profile details you provide</strong> — school, grade
              level or year, area of study, and a short bio, used to
              personalize your outreach drafts.
            </li>
            <li>
              <strong>Professors you add</strong> — name, email, school,
              department, research area, and any notes or drafts you write or
              generate for them.
            </li>
            <li>
              <strong>Saved prompts (templates)</strong> — the outreach
              templates you create and edit.
            </li>
            <li>
              <strong>Send status</strong> — whether and when an email was
              sent, and whether a reply was detected in that thread.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            How your Gmail access is used
          </h2>
          <p className="mt-2">
            Beacon requests two Gmail permissions, both scoped as narrowly as
            Google allows:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Send email</strong> — used only when you click
              &ldquo;Send&rdquo; on a specific, individually-reviewed draft.
              Beacon never sends email automatically or in bulk without your
              explicit action on that email.
            </li>
            <li>
              <strong>Read-only inbox access</strong> — used only to check
              for a reply in a Gmail thread that Beacon itself created by
              sending your outreach email. Beacon never reads, scans, or
              stores the contents of any other email in your inbox, and reply
              checks only happen when you click &ldquo;Check for
              reply&rdquo; — there is no background or automatic inbox
              scanning.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            AI features and third-party services
          </h2>
          <p className="mt-2">
            When you use AI-assisted drafting or Discover&apos;s researcher
            database, limited context (such as a professor&apos;s name,
            school, and research area, or your outreach template) is sent to:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>NVIDIA&apos;s NIM API</strong>, to generate draft text
              or extract researcher information from public web sources.
            </li>
            <li>
              <strong>Exa</strong>, a web search API, to find publicly
              available information about a professor&apos;s research.
            </li>
          </ul>
          <p className="mt-2">
            We never send your Gmail contents, your password, or other
            users&apos; data to these services. Discover&apos;s researcher
            database is built from public web sources and is not guaranteed
            to be accurate — the app always asks you to verify a
            professor&apos;s identity and email before contacting them.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            What we don&apos;t do
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>We don&apos;t sell or rent your data to anyone.</li>
            <li>We don&apos;t show ads or use your data for advertising.</li>
            <li>
              We don&apos;t send email on your behalf without you personally
              reviewing and approving that specific email first.
            </li>
            <li>
              We don&apos;t read, store, or scan any inbox content beyond
              detecting a reply in a thread Beacon itself started.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            Data storage and retention
          </h2>
          <p className="mt-2">
            Your data is stored in a hosted database used only by this app.
            It&apos;s retained for as long as your account exists, or until
            you delete individual professors or templates yourself within the
            app. To request full deletion of your account and all associated
            data, contact us at the email below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            Contact
          </h2>
          <p className="mt-2">
            Questions about this policy or your data? Email{" "}
            <a
              href="mailto:angad18.bhatia@gmail.com"
              className="text-accent hover:underline"
            >
              angad18.bhatia@gmail.com
            </a>
            .
          </p>
        </section>

        <p className="pt-4 text-xs text-zinc-400 dark:text-zinc-600">
          See also our{" "}
          <Link href="/terms" className="text-accent hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
