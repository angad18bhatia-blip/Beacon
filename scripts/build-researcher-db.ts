// Batch-builds the shared ResearcherDatabase table: for each
// {university, department} pair below, searches the real web via Exa,
// then asks Claude to extract only what's actually verifiable from those
// search results (never guess, never fabricate, mark UNKNOWN otherwise),
// and upserts the result. No manual "next" needed — it's just a loop.
//
// Run with:  npm run db:build-researchers
//
// PILOT SCOPE: this list is intentionally small (a handful of
// department jobs) so a first run costs a few dollars, not $100+.
// Once you've checked the output quality/cost yourself, add more
// {university, department} pairs and re-run — already-saved researchers
// are skipped, so it's safe to re-run with a longer list.

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { exaSearch } from "../src/lib/exa";
import { anthropic, CLAUDE_MODEL } from "../src/lib/anthropic";

const prisma = new PrismaClient();

const JOBS: { university: string; department: string }[] = [
  { university: "Massachusetts Institute of Technology", department: "Department of Computer Science (EECS)" },
  { university: "Massachusetts Institute of Technology", department: "Department of Biology" },
  { university: "Stanford University", department: "Department of Computer Science" },
  { university: "Stanford University", department: "Department of Biology" },
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
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const arrayMatch = candidate.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];
  try {
    const parsed = JSON.parse(arrayMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: buildPrompt(university, department, sources) }],
  });
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");

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
  if (!process.env.ANTHROPIC_API_KEY || !process.env.EXA_API_KEY) {
    console.error("Set ANTHROPIC_API_KEY and EXA_API_KEY in .env before running this.");
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
