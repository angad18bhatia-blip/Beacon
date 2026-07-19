import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/avatar";
import { AddProfessorForm } from "./add-professor-form";

const STATUS_LABELS = {
  NEW: "New",
  DRAFTED: "Drafted",
  APPROVED: "Approved",
  SENT: "Sent",
} as const;

type StatusKey = keyof typeof STATUS_LABELS;

export default async function ProfessorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; replied?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const { status, replied } = await searchParams;
  const statusFilter: StatusKey | undefined =
    status && status in STATUS_LABELS ? (status as StatusKey) : undefined;
  const repliedFilter = replied === "1";

  const professors = await prisma.professor.findMany({
    where: {
      userId: session.user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(repliedFilter ? { hasReply: true } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const filterLabel = repliedFilter
    ? "Replied"
    : statusFilter
      ? STATUS_LABELS[statusFilter]
      : null;

  return (
    <main className="page-glow mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {filterLabel ? `Professors — ${filterLabel}` : "Professors"}
        </h1>
        {filterLabel && (
          <Link
            href="/professors"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            Clear filter
          </Link>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {filterLabel
          ? `Showing professors filtered to: ${filterLabel}.`
          : "Add the professors you want to reach out to. You'll draft, review, and send each email individually."}
      </p>

      {!filterLabel && <AddProfessorForm />}

      <ul className="mt-8 divide-y divide-zinc-200 dark:divide-zinc-800">
        {professors.length === 0 && (
          <li className="py-8 text-center text-sm text-zinc-500">
            {filterLabel
              ? `No professors match "${filterLabel}".`
              : "No professors yet — add one above to get started."}
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
              {p.hasReply && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: "var(--accent2-soft)", color: "var(--accent2)" }}
                >
                  Replied
                </span>
              )}
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
