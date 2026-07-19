import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/sign-in-button";

const STEPS = [
  {
    title: "Sign in with Google",
    description:
      "One click, no password ever stored. This also grants permission to send mail as you, later, when you approve it.",
    color: "--accent",
  },
  {
    title: "Add professors",
    description:
      "Add them by hand, or search Discover's pre-verified researcher database and import them with one click.",
    color: "--pink",
  },
  {
    title: "Generate & review a draft",
    description:
      "Pick a saved prompt, generate a draft, then edit it by hand until it's exactly what you'd want to say yourself.",
    color: "--amber",
  },
  {
    title: "Send from your own Gmail",
    description:
      "One email per professor, always reviewed and approved by you first — never a mass blast.",
    color: "--teal",
  },
];

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.onboarded ? "/professors" : "/onboarding");
  }

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-24 text-center">
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
        Built for students
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
          You&apos;re a high school or college student looking for a research
          opportunity or a mentor. Add the professors you want to contact,
          generate a personalized draft for each one, review and edit it
          yourself, then send it straight from your own email &mdash; one
          email per professor, never a mass blast.
        </p>
        <SignInButton />
        <p className="max-w-md text-xs text-zinc-400 dark:text-zinc-600">
          We only ever send email that you have personally reviewed and
          approved, from your own Gmail account. We never see or store your
          password.
        </p>
      </div>

      <div className="mx-auto mt-24 w-full max-w-4xl">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-lg border p-5"
              style={{
                borderColor: `var(${step.color}-soft)`,
                background: `var(${step.color}-soft)`,
              }}
            >
              <span
                className="text-2xl font-semibold"
                style={{ color: `var(${step.color})` }}
              >
                {i + 1}
              </span>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
