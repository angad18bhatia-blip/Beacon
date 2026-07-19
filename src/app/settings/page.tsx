import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TemplateManager } from "./template-manager";
import { PromptGenerator } from "./prompt-generator";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/");

  const templates = await prisma.emailTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="page-glow mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          Your profile
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Update these anytime — they get dropped into every draft you
          generate from now on. Emails you&apos;ve already sent don&apos;t
          change.
        </p>
        <div className="mt-4">
          <ProfileForm
            initialSchool={user.school ?? ""}
            initialDegreeLevel={user.degreeLevel ?? ""}
            initialAreaOfStudy={user.areaOfStudy ?? ""}
            initialBio={user.bio ?? ""}
          />
        </div>
      </section>

      <hr className="mt-10 border-zinc-200 dark:border-zinc-800" />

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--accent2)" }}
          />
          Generate a prompt with AI
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Describe the tone or angle you want and AI will draft a new saved
          prompt for you to review below &mdash; it&apos;s never used to
          email anyone automatically.
        </p>
        <div className="mt-4">
          <PromptGenerator />
        </div>
      </section>

      <hr className="mt-10 border-zinc-200 dark:border-zinc-800" />

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--pink)" }}
          />
          Saved prompts
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Keep several templates around and pick which one to use per
          professor, or set one as the default.
        </p>
        <div className="mt-4">
          <TemplateManager initialTemplates={templates} />
        </div>
      </section>
    </main>
  );
}
