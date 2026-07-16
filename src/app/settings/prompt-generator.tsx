"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PromptGenerator() {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    setResult(null);
    setSaved(false);

    const res = await fetch("/api/templates/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Generation failed");
      setGenerating(false);
      return;
    }
    setResult({ subject: data.subject, body: data.body });
    setName(instruction.slice(0, 40) || "AI-generated prompt");
    setGenerating(false);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subject: result.subject,
        body: result.body,
        source: "ai_generated",
      }),
    });
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setError("Failed to save");
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleGenerate} className="flex flex-col gap-3">
        <textarea
          required
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Make it shorter and more casual, and mention I'm on the robotics team"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={generating || !instruction.trim()}
          className="self-start rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{
            backgroundImage: "linear-gradient(90deg, var(--accent), var(--accent2))",
          }}
        >
          {generating ? "Generating…" : "Generate prompt"}
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Save as
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <p className="mt-3 text-sm font-medium">{result.subject}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
            {result.body}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save as new prompt"}
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            This only saves a template &mdash; nothing gets sent to anyone
            from here.
          </p>
        </div>
      )}
    </div>
  );
}
