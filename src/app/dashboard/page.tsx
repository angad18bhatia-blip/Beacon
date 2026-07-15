import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardTable } from "./dashboard-table";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const professors = await prisma.professor.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const counts = {
    NEW: professors.filter((p) => p.status === "NEW").length,
    DRAFTED: professors.filter((p) => p.status === "DRAFTED").length,
    APPROVED: professors.filter((p) => p.status === "APPROVED").length,
    SENT: professors.filter((p) => p.status === "SENT").length,
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="mt-4 flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{counts.NEW} new</span>
        <span>{counts.DRAFTED} drafted</span>
        <span>{counts.APPROVED} approved</span>
        <span>{counts.SENT} sent</span>
      </div>

      <DashboardTable professors={professors} />
    </main>
  );
}
