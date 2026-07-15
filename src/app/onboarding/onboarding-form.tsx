"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [school, setSchool] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("Undergraduate");
  const [areaOfStudy, setAreaOfStudy] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school, degreeLevel, areaOfStudy, bio }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/professors");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
      <input type="hidden" value={defaultName} readOnly />

      <div>
        <label className="block text-sm font-medium">Your school</label>
        <input
          required
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          placeholder="e.g. University of Michigan"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Degree level</label>
        <select
          value={degreeLevel}
          onChange={(e) => setDegreeLevel(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option>Undergraduate</option>
          <option>Master&apos;s</option>
          <option>PhD</option>
          <option>Postdoc</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">
          Preferred area of study
        </label>
        <input
          required
          value={areaOfStudy}
          onChange={(e) => setAreaOfStudy(e.target.value)}
          placeholder="e.g. computational biology"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">
          Short background blurb
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          A sentence or two about relevant coursework, projects, or
          experience. This gets dropped into your email drafts.
        </p>
        <textarea
          required
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="I've taken coursework in..., and worked on a project involving..."
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
