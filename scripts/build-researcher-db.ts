// Batch-builds the shared ResearcherDatabase table: for each
// {university, department} pair below, searches the real web via Exa,
// then asks a free NVIDIA-hosted model (Llama 3.3 Nemotron Super 49B, via
// build.nvidia.com) to extract only what's actually verifiable from those
// search results (never guess, never fabricate, mark UNKNOWN otherwise),
// and upserts the result. No manual "next" needed — it's just a loop.
//
// Run with:  npm run db:build-researchers
//
// PILOT SCOPE: this list is intentionally small (a handful of
// department jobs) — NVIDIA's free tier is rate-limited (not billed), so
// there's no dollar cost, but a huge list could still burn through the
// per-minute request quota. Once you've checked the output quality
// yourself, add more {university, department} pairs and re-run —
// already-saved researchers are skipped, so it's safe to re-run with a
// longer list.

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { exaSearch } from "../src/lib/exa";
import { nvidiaChat } from "../src/lib/nvidia";
import { extractJson } from "../src/lib/extract-json";

const NEMOTRON_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1";

const prisma = new PrismaClient();

const JOBS: { university: string; department: string }[] = [
  { university: "Massachusetts Institute of Technology", department: "Department of Computer Science (EECS)" },
  { university: "Massachusetts Institute of Technology", department: "Department of Biology" },
  { university: "Stanford University", department: "Department of Computer Science" },
  { university: "Stanford University", department: "Department of Biology" },
  // Spread across more fields/universities so Discover isn't just CS + Biology
  { university: "Massachusetts Institute of Technology", department: "Department of Physics" },
  { university: "Stanford University", department: "Department of Chemistry" },
  { university: "UC Berkeley", department: "Department of Physics" },
  { university: "Princeton University", department: "Department of Mathematics" },
  { university: "Harvard University", department: "Department of Psychology" },
  { university: "California Institute of Technology", department: "Division of Chemistry and Chemical Engineering" },
  { university: "University of Michigan", department: "Department of Aerospace Engineering" },
  { university: "Georgia Institute of Technology", department: "School of Chemical and Biomolecular Engineering" },
  { university: "Cornell University", department: "Department of Astronomy" },
  { university: "UCLA", department: "Department of Neuroscience" },
];

type Researcher = {
  name: string;
  university: string;
  college: string | null;
  department: string;
  fieldOfResearch: string | null;
  researchSummary: string | null;
  email: string | null;
  facultyWebsite: string | null;
  verificationSources: string | null;
};

function buildPrompt(
  university: string,
  department: string,
  sources: { title: string | null; url: string; text: string }[],
) {
  const sourcesBlock = sources
    .map((s, i) => `[${i + 1}] ${s.title ?? s.url}\nURL: ${s.url}\n${s.text}`)
    .join("\n\n");

  return `You are an elite academic research analyst building a verified database of leading university researchers.

Your highest priorities: accuracy, verification, public contact information, completeness.
Never guess. Never infer. Never fabricate. If information cannot be verified FROM THE SOURCES BELOW, write null (not a guess).

OBJECTIVE
Find the top 3 CURRENTLY ACTIVE researchers in: ${department}, ${university}.
Exclude: retired, emeritus, former, and visiting faculty.

Base every fact ONLY on the search result sources below — do not use outside knowledge, since it can't be verified against a live source here.

SOURCES:
${sourcesBlock || "(no sources found — if you cannot verify any researcher from this, return an empty array)"}

Respond with ONLY a fenced JSON code block containing an array of up to 3 objects, each with exactly these fields:
{
  "name": "full legal name",
  "university": "${university}",
  "college": "college/school, e.g. 'College of Engineering', or null if unknown",
  "department": "${department}",
  "fieldOfResearch": "main research area, or null",
  "researchSummary": "2-4 sentences: what they research, problems they study, why it matters, or null",
  "email": "publicly listed university email found in the sources, or null — never guess an email format",
  "facultyWebsite": "their faculty/lab page URL from the sources, or null",
  "verificationSources": "newline-separated URLs from the sources above that support this entry, or null"
}
No other text outside the JSON code block.`;
}

function extractJsonArray(text: string): unknown[] {
  const parsed = extractJson(text);
  return Array.isArray(parsed) ? parsed : [];
}

function toResearcher(raw: unknown, university: string, department: string): Researcher | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || !r.name.trim()) return null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return {
    name: r.name,
    university,
    college: str(r.college),
    department,
    fieldOfResearch: str(r.fieldOfResearch),
    researchSummary: str(r.researchSummary),
    email: str(r.email),
    facultyWebsite: str(r.facultyWebsite),
    verificationSources: str(r.verificationSources),
  };
}

async function processDepartment(university: string, department: string) {
  console.log(`\n--- ${university} — ${department} ---`);

  const sources = await exaSearch(`${university} ${department} faculty directory researchers`, {
    numResults: 6,
  });
  console.log(`  found ${sources.length} web sources`);

  const text = await nvidiaChat({
    apiKey: process.env.NVIDIA_NEMOTRON_API_KEY!,
    model: NEMOTRON_MODEL,
    systemPrompt: "detailed thinking off",
    prompt: buildPrompt(university, department, sources),
    maxTokens: 2000,
  });

  const researchers = extractJsonArray(text)
    .map((r) => toResearcher(r, university, department))
    .filter((r): r is Researcher => r !== null);

  console.log(`  extracted ${researchers.length} verified researcher(s)`);

  for (const r of researchers) {
    const existing = await prisma.researcherDatabase.findFirst({
      where: { name: r.name, university: r.university, department: r.department },
    });
    if (existing) {
      console.log(`  skip (already have): ${r.name}`);
      continue;
    }
    await prisma.researcherDatabase.create({ data: r });
    console.log(`  saved: ${r.name} — ${r.email ?? "no email found"}`);
  }
}

async function main() {
  if (!process.env.NVIDIA_NEMOTRON_API_KEY || !process.env.EXA_API_KEY) {
    console.error("Set NVIDIA_NEMOTRON_API_KEY and EXA_API_KEY in .env before running this.");
    process.exit(1);
  }

  for (const job of JOBS) {
    try {
      await processDepartment(job.university, job.department);
    } catch (err) {
      console.error(`  FAILED for ${job.university} — ${job.department}:`, err);
    }
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main();
