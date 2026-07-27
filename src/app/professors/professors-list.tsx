"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProfessorModel } from "@/generated/prisma/models";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/avatar";

export function ProfessorsList({
  professors,
  emptyMessage,
}: {
  professors: ProfessorModel[];
  emptyMessage: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (
      !confirm(
        `Remove ${selected.size} professor${selected.size === 1 ? "" : "s"} from your list? This can't be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`/api/professors/${id}`, { method: "DELETE" }),
      ),
    );
    setSelected(new Set());
    setDeleting(false);
    router.refresh();
  }

  if (professors.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="mt-8">
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="rounded-full border px-4 py-2 text-sm font-medium text-danger disabled:opacity-50"
            style={{ borderColor: "var(--danger-soft)" }}
          >
            {deleting ? "Removing…" : `Delete ${selected.size} selected`}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            Clear selection
          </button>
        </div>
      )}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {professors.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-4">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="h-4 w-4"
            />
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
    </div>
  );
}
