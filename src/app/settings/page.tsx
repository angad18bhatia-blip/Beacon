import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TemplateForm } from "./template-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const template = await prisma.emailTemplate.findFirst({
    where: { userId: session.user.id },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Edit the default template used when you generate a draft. Available
        merge fields:{" "}
        <code className="text-xs">
          {
            "{{professor_name}} {{professor_school}} {{research_area}} {{student_name}} {{student_school}} {{area_of_study}} {{degree_level}} {{bio}}"
          }
        </code>
      </p>

      <TemplateForm
        initialSubject={template?.subject ?? ""}
        initialBody={template?.body ?? ""}
      />
    </main>
  );
}
