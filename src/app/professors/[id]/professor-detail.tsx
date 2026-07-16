"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProfessorModel, EmailTemplateModel } from "@/generated/prisma/models";
import { StatusBadge } from "@/components/status-badge";
import { Avatar } from "@/components/avatar";

export function ProfessorDetail({
  professor,
  studentEmail,
  templates,
}: {
  professor: ProfessorModel;
  studentEmail: string;
  templates: EmailTemplateModel[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(professor.draftSubject ?? "");
  const [body, setBody] = useState(professor.draftBody ?? "");
  const [status, setStatus] = useState(professor.status);
  const [templateNameUsed, setTemplateNameUsed] = useState(
    professor.templateNameUsed,
  );
  const [templateId, setTemplateId] = useState(
    templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? "",
  );
  const [busy, setBusy] = useState<
    | "idle"
    | "generating"
    | "ai-generating"
    | "saving"
    | "sending"
    | "deleting"
    | "checking-reply"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(professor.sentAt);
  const [aiSources, setAiSources] = useState<string[]>([]);
  const [hasReply, setHasReply] = useState(professor.hasReply);
  const [replySnippet, setReplySnippet] = useState(professor.replySnippet);
  const [repliedAt, setRepliedAt] = useState(professor.repliedAt);

  const isSent = status === "SENT";
  const isDirty =
    subject !== (professor.draftSubject ?? "") ||
    body !== (professor.draftBody ?? "");

  async function checkReply() {
    setBusy("checking-reply");
    setError(null);
    const res = await fetch(`/api/professors/${professor.id}/check-reply`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to check for a reply");
      setBusy("idle");
      return;
    }
    setHasReply(data.professor.hasReply);
    setReplySnippet(data.professor.replySnippet);
    setRepliedAt(data.professor.repliedAt);
    setBusy("idle");
  }

  async function generateDraft() {
    setBusy("generating");
    setError(null);
    setAiSources([]);
    const res = await fetch(`/api/professors/${professor.id}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: templateId || undefined }),
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
    setTemplateNameUsed(data.professor.templateNameUsed);
    setBusy("idle");
  }

  async function generateAIDraft() {
    setBusy("ai-generating");
    setError(null);
    const res = await fetch(`/api/professors/${professor.id}/draft-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: templateId || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to generate AI draft");
      setBusy("idle");
      return;
    }
    setSubject(data.professor.draftSubject ?? "");
    setBody(data.professor.draftBody ?? "");
    setStatus(data.professor.status);
    setTemplateNameUsed(data.professor.templateNameUsed);
    setAiSources(data.sources ?? []);
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

  const busyAtAll = busy !== "idle";

  return (
    <div>
      <Link
        href="/professors"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        ← Back to professors
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Avatar name={professor.name} />
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
        </div>
        <StatusBadge status={status} />
      </div>

      {isSent ? (
        <div
          className="mt-8 rounded-lg border p-4 text-sm"
          style={{ borderColor: "var(--teal-soft)", background: "var(--teal-soft)", color: "var(--teal)" }}
        >
          Sent{sentAt ? ` on ${new Date(sentAt).toLocaleString()}` : ""}.
          <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-black">
            <p className="font-medium">{professor.draftSubject}</p>
            <p className="mt-2 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {professor.draftBody}
            </p>
          </div>

          {hasReply ? (
            <div
              className="mt-3 rounded-md border p-3"
              style={{ borderColor: "var(--accent2-soft)", background: "var(--background)" }}
            >
              <p className="font-medium" style={{ color: "var(--accent2)" }}>
                Replied{repliedAt ? ` on ${new Date(repliedAt).toLocaleString()}` : ""}
              </p>
              {replySnippet && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  &ldquo;{replySnippet}&rdquo;
                </p>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                Open the thread in Gmail to read and respond in full.
              </p>
            </div>
          ) : (
            <button
              onClick={checkReply}
              disabled={busy !== "idle"}
              className="mt-3 rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ borderColor: "var(--teal)", color: "var(--teal)" }}
            >
              {busy === "checking-reply" ? "Checking…" : "Check for reply"}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <div className="mt-8">
          {templates.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Prompt to use
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isDefault ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!subject && !body ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={generateDraft}
                disabled={busyAtAll}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {busy === "generating" ? "Generating…" : "Generate draft"}
              </button>
              <button
                onClick={generateAIDraft}
                disabled={busyAtAll}
                className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, var(--accent), var(--accent2))",
                }}
                title="Uses a real web search to ground the email in this professor's actual research"
              >
                {busy === "ai-generating"
                  ? "Researching…"
                  : "✨ Ground with real research (AI)"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {templateNameUsed && (
                <p className="text-xs text-zinc-500">
                  Generated from: <span className="font-medium">{templateNameUsed}</span>
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
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
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              {aiSources.length > 0 && (
                <div className="text-xs text-zinc-500">
                  Sources used:{" "}
                  {aiSources.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      [{i + 1}]{" "}
                    </a>
                  ))}
                  — double-check these before sending.
                </div>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={generateDraft}
                  disabled={busyAtAll}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  Regenerate from template
                </button>
                <button
                  onClick={generateAIDraft}
                  disabled={busyAtAll}
                  className="rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{ borderColor: "var(--accent2-soft)", color: "var(--accent2)" }}
                >
                  {busy === "ai-generating" ? "Researching…" : "✨ Regenerate (AI-grounded)"}
                </button>
                <button
                  onClick={() => saveDraft(isDirty ? "DRAFTED" : undefined)}
                  disabled={busyAtAll || !isDirty}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  {busy === "saving" ? "Saving…" : "Save changes"}
                </button>
                {status !== "APPROVED" && (
                  <button
                    onClick={() => saveDraft("APPROVED")}
                    disabled={busyAtAll}
                    className="rounded-full border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={sendEmail}
                  disabled={busyAtAll || isDirty}
                  title={
                    isDirty ? "Save your changes before sending" : undefined
                  }
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
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
        disabled={busyAtAll}
        className="mt-10 text-sm text-danger hover:underline disabled:opacity-50"
      >
        {busy === "deleting" ? "Removing…" : "Remove this professor"}
      </button>
    </div>
  );
}
