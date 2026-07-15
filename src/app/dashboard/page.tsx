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

  const tiles = [
    {
      label: "New",
      count: professors.filter((p) => p.status === "NEW").length,
      color: "--accent2",
    },
    {
      label: "Drafted",
      count: professors.filter((p) => p.status === "DRAFTED").length,
      color: "--amber",
    },
    {
      label: "Approved",
      count: professors.filter((p) => p.status === "APPROVED").length,
      color: "--accent",
    },
    {
      label: "Sent",
      count: professors.filter((p) => p.status === "SENT").length,
      color: "--teal",
    },
  ];

  return (
    <main className="page-glow mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border p-4"
            style={{
              borderColor: `var(${tile.color}-soft)`,
              background: `var(${tile.color}-soft)`,
            }}
          >
            <p
              className="text-2xl font-semibold"
              style={{ color: `var(${tile.color})` }}
            >
              {tile.count}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {tile.label}
            </p>
          </div>
        ))}
      </div>

      <DashboardTable professors={professors} />
    </main>
  );
}
