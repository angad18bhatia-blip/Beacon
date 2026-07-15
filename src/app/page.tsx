import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/sign-in-button";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.onboarded ? "/professors" : "/onboarding");
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(45% 40% at 15% 10%, var(--accent-soft), transparent 70%), radial-gradient(40% 35% at 55% -5%, var(--pink-soft), transparent 70%), radial-gradient(35% 40% at 90% 20%, var(--teal-soft), transparent 70%), radial-gradient(30% 30% at 40% 40%, var(--amber-soft), transparent 70%)",
        }}
      />
      <span
        className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs tracking-wide text-accent uppercase"
        style={{ borderColor: "var(--accent-soft)", background: "var(--accent-soft)" }}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
        Built for high schoolers
      </span>
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8">
        <h1 className="text-4xl font-semibold tracking-tight">
          Reach out to professors about research,{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--accent), var(--pink))",
            }}
          >
            without the busywork
          </span>
        </h1>
        <p className="max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
          You&apos;re a high schooler looking for a research opportunity or a
          mentor. Add the professors you want to contact, generate a
          personalized draft for each one, review and edit it yourself, then
          send it straight from your own email &mdash; one email per
          professor, never a mass blast.
        </p>
        <SignInButton />
        <p className="max-w-md text-xs text-zinc-400 dark:text-zinc-600">
          We only ever send email that you have personally reviewed and
          approved, from your own Gmail account. We never see or store your
          password.
        </p>
      </div>
    </main>
  );
}
