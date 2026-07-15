import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (session.user.onboarded) redirect("/professors");

  return (
    <main className="page-glow mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Tell us about yourself
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This shows up in the emails you send to professors, so keep it
        genuine &mdash; you&apos;ll be able to edit every draft before it
        goes out.
      </p>
      <OnboardingForm defaultName={session.user.name ?? ""} />
    </main>
  );
}
