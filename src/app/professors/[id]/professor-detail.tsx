"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProfessorModel } from "@/generated/prisma/models";
import { StatusBadge } from "@/components/status-badge";

export function ProfessorDetail({
  professor,
  studentEmail,
}: {
  professor: ProfessorModel;
  studentEmail: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(professor.draftSubject ?? "");
  const [body, setBody] = useState(professor.draftBody ?? "");
  const [status, setStatus] = useState(professor.status);
  const [busy, setBusy] = useState<
    "idle" | "generating" | "saving" | "sending" | "deleting"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(professor.sentAt);

  const isSent = status === "SENT";
  const isDirty =
    subject !== (professor.draftSubject ?? "") ||
    body !== (professor.draftBody ?? "");

  async function generateDraft() {
    setBusy("generating");
    setError(null);
    const res = await fetch(`/api/professors/${professor.id}/draft`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to generate draft");
      setBusy("idle");
      return;
    }
    setSubject(data.professor.draftSubject ?? "");
    setBody(data.professor.draftBody ?? "");
    setStatus(data.professor.status);
    setBusy("idle");
  }

  async function saveDraft(nextStatus?: "DRAFTED" | "APPROVED") {
    setBusy("saving");
    setError(null);
    const res = await fetch(`/api/professors/${professor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftSubject: subject,
        draftBody: body,
        ...(nextStatus ? { status: nextStatus } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      setBusy("idle");
      return;
    }
    setStatus(data.professor.status);
    setBusy("idle");
    router.refresh();
  }

  async function sendEmail() {
    if (
      !confirm(
        `Send this email to ${professor.name} <${professor.email}> from ${studentEmail}? This can't be undone.`,
      )
    ) {
      return;
    }
    setBusy("sending");
    setError(null);
    const res = await fetch(`/api/professors/${professor.id}/send`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to send");
      setBusy("idle");
      return;
    }
    setStatus("SENT");
    setSentAt(data.professor.sentAt);
    setBusy("idle");
    router.refresh();
  }

  async function deleteProfessor() {
    if (!confirm(`Remove ${professor.name} from your list?`)) return;
    setBusy("deleting");
    const res = await fetch(`/api/professors/${professor.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.push("/professors");
      router.refresh();
    } else {
      setBusy("idle");
    }
  }

  return (
    <div>
      <Link
        href="/professors"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        ← Back to professors
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {professor.name}
          </h1>
          <p className="text-sm text-zinc-500">
            {professor.email} · {professor.school}
            {professor.department ? ` · ${professor.department}` : ""}
          </p>
          {professor.researchArea && (
            <p className="mt-1 text-sm text-zinc-500">
              {professor.researchArea}
            </p>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {isSent ? (
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          Sent{sentAt ? ` on ${new Date(sentAt).toLocaleString()}` : ""}.
          <div className="mt-3 rounded-md border border-green-200 bg-white p-3 dark:border-green-900 dark:bg-black">
            <p className="font-medium">{professor.draftSubject}</p>
            <p className="mt-2 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {professor.draftBody}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          {!subject && !body ? (
            <button
              onClick={generateDraft}
              disabled={busy !== "idle"}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {busy === "generating" ? "Generating…" : "Generate draft"}
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Body
                </label>
                <textarea
                  rows={14}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={generateDraft}
                  disabled={busy !== "idle"}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Regenerate from template
                </button>
                <button
                  onClick={() => saveDraft(isDirty ? "DRAFTED" : undefined)}
                  disabled={busy !== "idle" || !isDirty}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  {busy === "saving" ? "Saving…" : "Save changes"}
                </button>
                {status !== "APPROVED" && (
                  <button
                    onClick={() => saveDraft("APPROVED")}
                    disabled={busy !== "idle"}
                    className="rounded-full border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={sendEmail}
                  disabled={busy !== "idle" || isDirty}
                  title={
                    isDirty ? "Save your changes before sending" : undefined
                  }
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {busy === "sending" ? "Sending…" : "Send email"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={deleteProfessor}
        disabled={busy !== "idle"}
        className="mt-10 text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {busy === "deleting" ? "Removing…" : "Remove this professor"}
      </button>
    </div>
  );
}
