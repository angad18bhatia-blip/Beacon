import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { discoverWhere, DISCOVER_PAGE_SIZE } from "@/lib/discover-search";
import { DiscoverResults } from "./discover-results";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboarded) redirect("/onboarding");

  const { q } = await searchParams;
  const query = q ?? "";
  const hasQuery = Boolean(query.trim());
  const where = discoverWhere(query);

  const [results, matchingCount, totalCount] = await Promise.all([
    prisma.researcherDatabase.findMany({
      where,
      orderBy: { name: "asc" },
      take: DISCOVER_PAGE_SIZE,
    }),
    prisma.researcherDatabase.count({ where }),
    prisma.researcherDatabase.count(),
  ]);

  return (
    <main className="page-glow mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Search a pre-verified database of researchers instead of the live
        web &mdash; free to search, and no per-query AI guessing.
      </p>

      <div
        className="mt-4 rounded-md border px-3 py-2 text-xs"
        style={{ borderColor: "var(--danger-soft)", background: "var(--danger-soft)" }}
      >
        <span className="font-medium text-danger">Still double-check. </span>
        This database was assembled by AI from public web sources, not
        hand-verified by a person. Confirm a professor&apos;s identity and
        email against their real faculty page before you send anything.
      </div>

      {totalCount === 0 ? (
        <div className="mt-8 rounded-lg border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800">
          The database is empty &mdash; it hasn&apos;t been built yet. Run{" "}
          <code className="text-xs">npm run db:build-researchers</code> to
          populate it (see README).
        </div>
      ) : (
        <>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by name, university, department, or field of research"
              className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Search
            </button>
          </form>

          <div className="mt-8">
            {hasQuery && results.length === 0 && (
              <p className="text-sm text-zinc-500">
                No matches. Try a broader search.
              </p>
            )}
            <DiscoverResults
              initialResults={results}
              totalMatching={matchingCount}
              query={query}
            />
          </div>
        </>
      )}
    </main>
  );
}
