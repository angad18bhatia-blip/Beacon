import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/sign-in-button";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.onboarded ? "/professors" : "/onboarding");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Reach out to professors about research, without the busywork
      </h1>
      <p className="max-w-lg text-lg text-zinc-600 dark:text-zinc-400">
        Add the professors you want to contact, generate a personalized
        draft for each one, review and edit it yourself, then send it
        straight from your own email &mdash; one email per professor, never a
        mass blast.
      </p>
      <SignInButton />
      <p className="max-w-md text-xs text-zinc-400 dark:text-zinc-600">
        We only ever send email that you have personally reviewed and
        approved, from your own Gmail account. We never see or store your
        password.
      </p>
    </main>
  );
}
