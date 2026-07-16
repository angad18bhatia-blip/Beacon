import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfessorDetail } from "./professor-detail";

export default async function ProfessorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const { id } = await params;
  const [professor, templates] = await Promise.all([
    prisma.professor.findUnique({ where: { id } }),
    prisma.emailTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!professor || professor.userId !== session.user.id) {
    notFound();
  }

  return (
    <main className="page-glow mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <ProfessorDetail
        professor={professor}
        studentEmail={session.user.email!}
        templates={templates}
      />
    </main>
  );
}
