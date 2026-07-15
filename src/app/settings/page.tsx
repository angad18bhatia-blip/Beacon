import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TemplateForm } from "./template-form";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/");

  const template = await prisma.emailTemplate.findFirst({
    where: { userId: session.user.id },
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
            style={{ background: "var(--pink)" }}
          />
          Email template
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Edit the default template used when you generate a draft. Available
          merge fields:{" "}
          <code className="text-xs">
            {
              "{{professor_name}} {{professor_school}} {{research_area}} {{student_name}} {{student_school}} {{area_of_study}} {{degree_level}} {{bio}}"
            }
          </code>
        </p>
        <div className="mt-4">
          <TemplateForm
            initialSubject={template?.subject ?? ""}
            initialBody={template?.body ?? ""}
          />
        </div>
      </section>
    </main>
  );
}
