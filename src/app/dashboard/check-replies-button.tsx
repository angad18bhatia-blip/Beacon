"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CheckRepliesButton() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setChecking(true);
    setError(null);
    setSummary(null);
    const res = await fetch("/api/professors/check-replies", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to check for replies");
      setChecking(false);
      return;
    }
    setSummary(
      `Checked ${data.checked}, found ${data.newReplies} new repl${data.newReplies === 1 ? "y" : "ies"}.`,
    );
    setChecking(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleCheck}
        disabled={checking}
        className="rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50"
        style={{ borderColor: "var(--accent2)", color: "var(--accent2)" }}
      >
        {checking ? "Checking…" : "Check for replies"}
      </button>
      {summary && <span className="text-sm text-zinc-500">{summary}</span>}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
