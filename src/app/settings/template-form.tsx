"use client";

import { useState } from "react";

export function TemplateForm({
  initialSubject,
  initialBody,
}: {
  initialSubject: string;
  initialBody: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });

    if (!res.ok) {
      setError("Failed to save template");
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Subject template
        </label>
        <input
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Body template
        </label>
        <textarea
          rows={14}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm" style={{ color: "var(--teal)" }}>Saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save template"}
      </button>
    </form>
  );
}
