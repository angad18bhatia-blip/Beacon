import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/avatar";
import { AddProfessorForm } from "./add-professor-form";

export default async function ProfessorsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const professors = await prisma.professor.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="page-glow mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Professors</h1>
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Add the professors you want to reach out to. You&apos;ll draft,
        review, and send each email individually.
      </p>

      <AddProfessorForm />

      <ul className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
        {professors.length === 0 && (
          <li className="py-8 text-center text-sm text-zinc-500">
            No professors yet &mdash; add one above to get started.
          </li>
        )}
        {professors.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-4">
            <Avatar name={p.name} />
            <div className="flex-1">
              <Link
                href={`/professors/${p.id}`}
                className="font-medium hover:underline"
              >
                {p.name}
              </Link>
              <p className="text-sm text-zinc-500">
                {p.school}
                {p.department ? ` · ${p.department}` : ""}
              </p>
              {p.researchArea && (
                <p className="text-xs text-zinc-400">{p.researchArea}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={p.status} />
              <Link
                href={`/professors/${p.id}`}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Open →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
