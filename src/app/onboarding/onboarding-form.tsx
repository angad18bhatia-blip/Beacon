"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [school, setSchool] = useState("");
  const [degreeLevel, setDegreeLevel] = useState("9th Grader");
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
          placeholder="e.g. Lincoln High School or UC Berkeley"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Grade / year level</label>
        <select
          value={degreeLevel}
          onChange={(e) => setDegreeLevel(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        >
          <optgroup label="High school">
            <option>9th Grader</option>
            <option>10th Grader</option>
            <option>11th Grader</option>
            <option>12th Grader</option>
          </optgroup>
          <optgroup label="College">
            <option>College Freshman</option>
            <option>College Sophomore</option>
            <option>College Junior</option>
            <option>College Senior</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Area of interest</label>
        <input
          required
          value={areaOfStudy}
          onChange={(e) => setAreaOfStudy(e.target.value)}
          placeholder="e.g. marine biology"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">
          Short background blurb
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          A sentence or two about relevant classes, clubs, science fair
          projects, or other experience. This gets dropped into your email
          drafts.
        </p>
        <textarea
          required
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="I've taken AP Biology and worked on a science fair project involving..."
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
