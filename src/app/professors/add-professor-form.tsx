"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const empty = {
  name: "",
  email: "",
  school: "",
  department: "",
  researchArea: "",
  notes: "",
};

export function AddProfessorForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof empty>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/professors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    setForm(empty);
    setOpen(false);
    setSubmitting(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        + Add professor
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Name
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Dr. Jane Smith"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="jsmith@university.edu"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            School
          </label>
          <input
            required
            value={form.school}
            onChange={(e) => update("school", e.target.value)}
            placeholder="Stanford University"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Department
          </label>
          <input
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
            placeholder="Computer Science"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Research area
          </label>
          <input
            value={form.researchArea}
            onChange={(e) => update("researchArea", e.target.value)}
            placeholder="e.g. reinforcement learning for robotics"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Notes (optional, not included in the email)
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add professor"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setForm(empty);
            setError(null);
          }}
          className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
