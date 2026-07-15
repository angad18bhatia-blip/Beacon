"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProfessorModel } from "@/generated/prisma/models";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/avatar";

export function DashboardTable({ professors }: { professors: ProfessorModel[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<string | null>(null);

  const approvedCount = professors.filter((p) => p.status === "APPROVED")
    .length;

  async function sendOne(id: string, name: string, email: string) {
    if (!confirm(`Send this email to ${name} <${email}>? This can't be undone.`)) {
      return;
    }
    setBusyId(id);
    await fetch(`/api/professors/${id}/send`, { method: "POST" });
    setBusyId(null);
    router.refresh();
  }

  async function sendAllApproved() {
    if (
      !confirm(
        `Send ${approvedCount} approved email${approvedCount === 1 ? "" : "s"} now? This can't be undone.`,
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setBulkSummary(null);
    const res = await fetch("/api/professors/send-all", { method: "POST" });
    const data = await res.json();
    const sent = (data.results ?? []).filter((r: { ok: boolean }) => r.ok);
    const failed = (data.results ?? []).filter((r: { ok: boolean }) => !r.ok);
    setBulkSummary(
      `Sent ${sent.length}${failed.length ? `, ${failed.length} failed` : ""}.`,
    );
    setBulkBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-8">
      {approvedCount > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={sendAllApproved}
            disabled={bulkBusy}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {bulkBusy
              ? "Sending…"
              : `Send all ${approvedCount} approved email${approvedCount === 1 ? "" : "s"}`}
          </button>
          {bulkSummary && (
            <span className="text-sm text-zinc-500">{bulkSummary}</span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Professor</th>
              <th className="px-4 py-2 font-medium">School</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {professors.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/professors/${p.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Avatar name={p.name} />
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-500">{p.school}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {p.status === "APPROVED" && (
                    <button
                      onClick={() => sendOne(p.id, p.name, p.email)}
                      disabled={busyId === p.id}
                      className="text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white"
                    >
                      {busyId === p.id ? "Sending…" : "Send"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {professors.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No professors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
