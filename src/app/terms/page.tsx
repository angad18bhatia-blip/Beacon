import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Beacon",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Last updated: July 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300">
        <p>
          Beacon is a free tool that helps students draft and send
          research-outreach emails to professors from their own Gmail
          account. By signing in and using Beacon, you agree to these terms.
        </p>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            What Beacon does
          </h2>
          <p className="mt-2">
            Beacon lets you add professors, generate a draft email for each
            one (from a saved template or with AI assistance), review and
            edit that draft yourself, and send it from your own Gmail
            account. Beacon sends one email at a time, only when you
            explicitly click &ldquo;Send&rdquo; on a draft you&apos;ve
            reviewed — it never sends email automatically or in bulk on your
            behalf.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            Your responsibilities
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              You&apos;re responsible for the content of every email you send
              through Beacon — review each draft before sending it.
            </li>
            <li>
              Discover&apos;s researcher database is AI-assembled from public
              web sources and may contain mistakes or out-of-date
              information. Verify a professor&apos;s identity and email
              address independently before contacting them.
            </li>
            <li>
              Don&apos;t use Beacon to send spam, harassment, or any content
              that violates Google&apos;s{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                API Services User Data Policy
              </a>{" "}
              or Gmail&apos;s own terms of use.
            </li>
            <li>
              Keep your account credentials (your Google account) secure —
              Beacon never asks for or stores your password.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            No guarantees
          </h2>
          <p className="mt-2">
            Beacon is provided &ldquo;as is,&rdquo; free of charge, without
            warranty of any kind. We don&apos;t guarantee that a professor
            will respond, that AI-generated content or Discover&apos;s
            researcher data is accurate, or that the service will always be
            available.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            Changes and termination
          </h2>
          <p className="mt-2">
            We may update these terms, the app, or its features at any time.
            You can stop using Beacon and revoke its access to your Google
            account at any time from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Google Account permissions
            </a>{" "}
            page.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-zinc-900 dark:text-white">
            Contact
          </h2>
          <p className="mt-2">
            Questions about these terms? Email{" "}
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
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
