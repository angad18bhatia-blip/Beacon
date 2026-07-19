import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { exaSearch } from "@/lib/exa";
import { nvidiaChat } from "@/lib/nvidia";
import { extractJson } from "@/lib/extract-json";
import { getCapabilityNote } from "@/lib/template";

const NEMOTRON_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1";
const DAILY_LIMIT = 10;

function buildPrompt(opts: {
  professorName: string;
  professorSchool: string;
  professorDepartment: string | null;
  context: string;
  studentName: string;
  studentSchool: string;
  areaOfStudy: string;
  degreeLevel: string;
  bio: string;
  templateSubject: string;
  templateBody: string;
}) {
  return `Write a cold-outreach email from a student to a professor about research opportunities.

Use ONLY the verified information below about the professor's research — never invent specifics that aren't present in it. If it doesn't give you enough to say something concrete and true, write a warmer, more general email instead of guessing at specifics.

PROFESSOR: ${opts.professorName}${opts.professorDepartment ? `, ${opts.professorDepartment}` : ""} at ${opts.professorSchool}

VERIFIED CONTEXT ABOUT THEIR RESEARCH:
${opts.context || "(none found)"}

STUDENT (sign the email with this exact name, do not invent a different one): ${opts.studentName || "the student"}, ${opts.degreeLevel} at ${opts.studentSchool}, interested in ${opts.areaOfStudy}.
${opts.bio ? `Student bio: ${opts.bio}` : ""}

What to ask for, based on the student's level — match this sentiment rather than a generic "shadowing" ask: ${getCapabilityNote(opts.degreeLevel)}

Match the tone/style of this saved template (for reference only — write fresh wording, don't copy it verbatim):
Subject: ${opts.templateSubject}
Body: ${opts.templateBody}

Format the body as a real email, not one run-on paragraph: a one-line greeting ("Dear Professor X,"), one or two short body paragraphs, then a sign-off on its own line ("Best regards," followed by the student's name on the next line) — separate each of these with a blank line (a literal \\n\\n between them in the JSON string value), the same way the template above is broken into lines.

Write the actual final email with real values plugged in directly — no {{merge field}} placeholders, no bracketed instructions left in, no placeholder names. Respond with ONLY a JSON object: {"subject": "...", "body": "..."}. No commentary before or after it, and don't offer a second version.`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { templateId } = await req.json().catch(() => ({ templateId: undefined }));

  const [professor, user] = await Promise.all([
    prisma.professor.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  if (!professor || professor.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (professor.status === "SENT") {
    return NextResponse.json(
      { error: "This email has already been sent" },
      { status: 409 },
    );
  }
  if (!user) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }

  const template = templateId
    ? await prisma.emailTemplate.findUnique({ where: { id: templateId } })
    : await prisma.emailTemplate.findFirst({
        where: { userId: session.user.id, isDefault: true },
      });

  if (!template || template.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Complete onboarding first" },
      { status: 400 },
    );
  }

  const today = new Date().toDateString();
  const lastDay = user.aiDraftCountDate
    ? new Date(user.aiDraftCountDate).toDateString()
    : null;
  const countToday = lastDay === today ? user.aiDraftCount : 0;

  if (countToday >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `You've hit today's limit of ${DAILY_LIMIT} AI-grounded drafts. Please try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  if (!process.env.NVIDIA_NEMOTRON_API_KEY) {
    return NextResponse.json(
      { error: "AI-grounded drafting isn't configured on this server yet (missing NVIDIA_NEMOTRON_API_KEY)" },
      { status: 500 },
    );
  }

  // Prefer whatever Discover's database already knows about this professor
  // — free, instant, no live call. Only fall back to a live Exa search if
  // there's nothing usable on file (not imported from Discover, or the
  // entry has no research summary/projects).
  let context = "";
  let sources: string[] = [];

  if (professor.importedFromDbId) {
    const dbEntry = await prisma.researcherDatabase.findUnique({
      where: { id: professor.importedFromDbId },
    });
    if (dbEntry && (dbEntry.researchSummary || dbEntry.recentProjects)) {
      context = [dbEntry.researchSummary, dbEntry.recentProjects]
        .filter(Boolean)
        .join("\n\n");
      sources = [
        dbEntry.facultyWebsite,
        dbEntry.labWebsite,
        ...(dbEntry.verificationSources?.split("\n") ?? []),
      ].filter((s): s is string => Boolean(s && s.trim()));
    }
  }

  if (!context) {
    if (!process.env.EXA_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Nothing on file for this professor in Discover, and live web search isn't configured (missing EXA_API_KEY).",
        },
        { status: 500 },
      );
    }
    try {
      const results = await exaSearch(
        `${professor.name} ${professor.school} research`,
        { numResults: 5 },
      );
      context = results.map((r) => `${r.title ?? r.url}\n${r.text}`).join("\n\n");
      sources = results.map((r) => r.url);
    } catch (err) {
      console.error("Exa search failed for AI-grounded draft", err);
      return NextResponse.json(
        { error: "Couldn't search the web for this professor right now. Please try again." },
        { status: 502 },
      );
    }
  }

  const prompt = buildPrompt({
    professorName: professor.name,
    professorSchool: professor.school,
    professorDepartment: professor.department,
    context,
    studentName: user.name || "",
    studentSchool: user.school || "",
    areaOfStudy: user.areaOfStudy || "",
    degreeLevel: (user.degreeLevel || "").toLowerCase(),
    bio: user.bio || "",
    templateSubject: template.subject,
    templateBody: template.body,
  });

  let responseText = "";
  try {
    responseText = await nvidiaChat({
      apiKey: process.env.NVIDIA_NEMOTRON_API_KEY,
      model: NEMOTRON_MODEL,
      systemPrompt: "detailed thinking off",
      prompt,
      maxTokens: 1200,
    });
  } catch (err) {
    console.error("AI-grounded draft generation failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Generation failed. Please try again.",
      },
      { status: 502 },
    );
  }

  const parsed = extractJson(responseText) as
    | { subject?: string; body?: string }
    | null;
  const subject = parsed?.subject;
  const body = parsed?.body;
  if (!subject || !body) {
    return NextResponse.json(
      {
        error:
          "Couldn't generate a usable draft. Please try again, or use the regular template instead.",
      },
      { status: 502 },
    );
  }

  try {
    const updated = await prisma.professor.update({
      where: { id },
      data: {
        draftSubject: subject,
        draftBody: body,
        status: "DRAFTED",
        templateNameUsed: `${template.name} (AI-grounded)`,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { aiDraftCount: countToday + 1, aiDraftCountDate: new Date() },
    });

    return NextResponse.json({ professor: updated, sources: [...new Set(sources)] });
  } catch (err) {
    console.error("Failed to save AI-grounded draft", err);
    return NextResponse.json(
      { error: "Generated a draft but couldn't save it. Please try again." },
      { status: 500 },
    );
  }
}
