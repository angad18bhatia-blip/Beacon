"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailTemplateModel } from "@/generated/prisma/models";

const MERGE_FIELDS =
  "{{professor_name}} {{professor_school}} {{research_area}} {{student_name}} {{student_school}} {{area_of_study}} {{degree_level}} {{bio}} {{capability_note}}";

function TemplateEditor({
  template,
  onSaved,
  onCancel,
}: {
  template: { name: string; subject: string; body: string };
  onSaved: (data: { name: string; subject: string; body: string }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
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
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setSaving(true);
            await onSaved({ name, subject, body });
            setSaving(false);
          }}
          disabled={saving}
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="self-start rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function TemplateManager({
  initialTemplates,
}: {
  initialTemplates: EmailTemplateModel[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
    router.refresh();
  }

  async function saveEdit(
    id: string,
    data: { name: string; subject: string; body: string },
  ) {
    const res = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError("Failed to save template");
      return;
    }
    setEditingId(null);
    await refresh();
  }

  async function createTemplate(data: {
    name: string;
    subject: string;
    body: string;
  }) {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError("Failed to create template");
      return;
    }
    setCreating(false);
    await refresh();
  }

  async function setActive(id: string) {
    setError(null);
    const res = await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setActive: true }),
    });
    if (!res.ok) {
      setError("Failed to set active template");
      return;
    }
    await refresh();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this saved prompt?")) return;
    setError(null);
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete template");
      return;
    }
    await refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        Available merge fields: <code className="text-xs">{MERGE_FIELDS}</code>
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            {editingId === t.id ? (
              <TemplateEditor
                template={t}
                onSaved={(data) => saveEdit(t.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.name}</p>
                    {t.isDefault && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "var(--teal-soft)", color: "var(--teal)" }}
                      >
                        Active
                      </span>
                    )}
                    {t.source === "ai_generated" && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "var(--accent2-soft)", color: "var(--accent2)" }}
                      >
                        AI-generated
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{t.subject}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
                  {!t.isDefault && (
                    <button
                      onClick={() => setActive(t.id)}
                      className="font-medium text-accent hover:underline"
                    >
                      Set active
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(t.id)}
                    className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Edit
                  </button>
                  {templates.length > 1 && (
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="font-medium text-danger hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {creating ? (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <TemplateEditor
            template={{ name: "New prompt", subject: "", body: "" }}
            onSaved={createTemplate}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="self-start rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          + Add a saved prompt
        </button>
      )}
    </div>
  );
}
