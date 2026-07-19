"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResearcherDatabaseModel } from "@/generated/prisma/models";

export function DiscoverResults({
  initialResults,
  totalMatching,
  query,
}: {
  initialResults: ResearcherDatabaseModel[];
  totalMatching: number;
  query: string;
}) {
  const router = useRouter();
  const [results, setResults] = useState(initialResults);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    setImporting(true);
    const toImport = results.filter((r) => selected.has(r.id));
    for (const r of toImport) {
      if (!r.email) continue;
      await fetch("/api/professors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: r.name,
          email: r.email,
          school: r.university,
          department: r.department,
          researchArea: r.fieldOfResearch,
          source: "database",
          importedFromDbId: r.id,
        }),
      });
    }
    setImporting(false);
    router.push("/professors");
    router.refresh();
  }

  async function loadMore() {
    setLoadingMore(true);
    const params = new URLSearchParams({ q: query, skip: String(results.length) });
    const res = await fetch(`/api/discover?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setResults((prev) => [...prev, ...(data.results ?? [])]);
    }
    setLoadingMore(false);
  }

  if (results.length === 0) return null;

  const selectableCount = results.filter((r) => r.email && selected.has(r.id)).length;
  const hasMore = results.length < totalMatching;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {results.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <input
              type="checkbox"
              disabled={!r.email}
              checked={selected.has(r.id)}
              onChange={() => toggle(r.id)}
              className="mt-1 h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{r.name}</p>
                {r.outreachScore != null && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: "var(--teal-soft)", color: "var(--teal)" }}
                  >
                    Fit {r.outreachScore}/10
                  </span>
                )}
                {r.responseProbability && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: "var(--accent2-soft)", color: "var(--accent2)" }}
                  >
                    {r.responseProbability} response likelihood
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500">
                {r.title ? `${r.title} · ` : ""}
                {r.university}
                {r.department ? ` · ${r.department}` : ""}
              </p>
              {r.fieldOfResearch && (
                <p className="text-xs text-zinc-400">{r.fieldOfResearch}</p>
              )}
              {r.researchSummary && (
                <p className="mt-1 text-xs text-zinc-500">{r.researchSummary}</p>
              )}
              {r.recentProjects && (
                <p className="mt-1 text-xs text-zinc-500">
                  <span className="font-medium">Recent: </span>
                  {r.recentProjects}
                </p>
              )}
              {r.undergradMentoring && (
                <p className="mt-1 text-xs text-zinc-500">
                  <span className="font-medium">Mentoring: </span>
                  {r.undergradMentoring}
                </p>
              )}
              {r.notes && (
                <p className="mt-1 text-xs text-zinc-400 italic">{r.notes}</p>
              )}
              <p className="mt-1 text-xs">
                {r.email ? (
                  r.email
                ) : (
                  <span className="text-amber">
                    No email found yet — try a quick search for their name to
                    find one on their faculty page.
                  </span>
                )}
              </p>
              <div className="mt-1 flex gap-3">
                {r.facultyWebsite && (
                  <a
                    href={r.facultyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-accent hover:underline"
                  >
                    Faculty page ↗
                  </a>
                )}
                {r.labWebsite && (
                  <a
                    href={r.labWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-accent hover:underline"
                  >
                    Lab site ↗
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        {results.some((r) => r.email) && (
          <button
            onClick={handleImport}
            disabled={selectableCount === 0 || importing}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {importing ? "Adding…" : `Add ${selectableCount || ""} selected to my professors`}
          </button>
        )}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {loadingMore ? "Loading…" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
