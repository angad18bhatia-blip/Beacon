import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const professors = await prisma.professor.findMany({
    where: { userId: session.user.id },
  });

  const funnel = [
    { label: "New", count: professors.filter((p) => p.status === "NEW").length, color: "--accent2" },
    { label: "Drafted", count: professors.filter((p) => p.status === "DRAFTED").length, color: "--amber" },
    { label: "Approved", count: professors.filter((p) => p.status === "APPROVED").length, color: "--accent" },
    { label: "Sent", count: professors.filter((p) => p.status === "SENT").length, color: "--teal" },
    { label: "Replied", count: professors.filter((p) => p.hasReply).length, color: "--pink" },
  ];

  const sent = professors.filter((p) => p.status === "SENT");
  const byTemplate = new Map<string, { sent: number; replied: number }>();
  for (const p of sent) {
    const key = p.templateNameUsed ?? "Unknown prompt";
    const entry = byTemplate.get(key) ?? { sent: 0, replied: 0 };
    entry.sent += 1;
    if (p.hasReply) entry.replied += 1;
    byTemplate.set(key, entry);
  }
  const templateRows = [...byTemplate.entries()]
    .map(([name, v]) => ({
      name,
      sent: v.sent,
      replied: v.replied,
      rate: v.sent > 0 ? Math.round((v.replied / v.sent) * 100) : 0,
    }))
    .sort((a, b) => b.sent - a.sent);

  const overallRate =
    sent.length > 0
      ? Math.round((sent.filter((p) => p.hasReply).length / sent.length) * 100)
      : 0;

  return (
    <main className="page-glow mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Overall reply rate: {sent.length === 0 ? "—" : `${overallRate}% (${sent.filter((p) => p.hasReply).length}/${sent.length} sent)`}
        {sent.length > 0 && " · run \"Check for replies\" on the dashboard to keep this fresh."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {funnel.map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border p-4"
            style={{ borderColor: `var(${tile.color}-soft)`, background: `var(${tile.color}-soft)` }}
          >
            <p className="text-2xl font-semibold" style={{ color: `var(${tile.color})` }}>
              {tile.count}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">{tile.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold tracking-tight">
        Which prompts are working
      </h2>
      {templateRows.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">
          Send a few emails to start seeing per-prompt reply rates here.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 font-medium">Prompt</th>
                <th className="px-4 py-2 font-medium">Sent</th>
                <th className="px-4 py-2 font-medium">Replied</th>
                <th className="px-4 py-2 font-medium">Reply rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {templateRows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.sent}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.replied}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${row.rate}%`, background: "var(--pink)" }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{row.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        Reply rates are a signal, not a guarantee &mdash; small sample sizes
        (a handful of emails per prompt) will bounce around a lot. Don&apos;t
        over-index on this until you&apos;ve sent enough to trust it.
      </p>
    </main>
  );
}
