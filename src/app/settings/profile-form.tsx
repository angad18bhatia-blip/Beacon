"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileForm({
  initialSchool,
  initialDegreeLevel,
  initialAreaOfStudy,
  initialBio,
}: {
  initialSchool: string;
  initialDegreeLevel: string;
  initialAreaOfStudy: string;
  initialBio: string;
}) {
  const router = useRouter();
  const [school, setSchool] = useState(initialSchool);
  const [degreeLevel, setDegreeLevel] = useState(
    initialDegreeLevel || "9th Grade",
  );
  const [areaOfStudy, setAreaOfStudy] = useState(initialAreaOfStudy);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school, degreeLevel, areaOfStudy, bio }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
    } else {
      setSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium">Your high school</label>
        <input
          required
          value={school}
          onChange={(e) => {
            setSchool(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Grade level</label>
        <select
          value={degreeLevel}
          onChange={(e) => {
            setDegreeLevel(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option>9th Grade</option>
          <option>10th Grade</option>
          <option>11th Grade</option>
          <option>12th Grade</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">Area of interest</label>
        <input
          required
          value={areaOfStudy}
          onChange={(e) => {
            setAreaOfStudy(e.target.value);
            setSaved(false);
          }}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">
          Short background blurb
        </label>
        <textarea
          required
          rows={4}
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
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
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
