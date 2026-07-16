import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { exaSearch } from "@/lib/exa";

const DAILY_LIMIT = 10;

function extractJson(text: string): { subject?: string; body?: string } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) return {};
  try {
    return JSON.parse(objectMatch[0]);
  } catch {
    return {};
  }
}

// Generates a draft grounded in the professor's actual, real research
// (via an Exa web search) rather than only merge-field substitution.
// Costs an Exa search + a Claude call, so it shares the same daily
// budget as the plain prompt generator.
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

  if (!professor || professor.userId !== session.user.id || !user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (professor.status === "SENT") {
    return NextResponse.json(
      { error: "This email has already been sent" },
      { status: 409 },
    );
  }

  const today = new Date().toDateString();
  const lastDay = user.promptGenCountDate
    ? new Date(user.promptGenCountDate).toDateString()
    : null;
  const countToday = lastDay === today ? user.promptGenCount : 0;

  if (countToday >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `You've hit today's limit of ${DAILY_LIMIT} AI generations. Please try again tomorrow, or use "Generate draft" instead.`,
      },
      { status: 429 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY || !process.env.EXA_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI-grounded drafts aren't configured on this server yet (missing ANTHROPIC_API_KEY or EXA_API_KEY)",
      },
      { status: 500 },
    );
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

  let searchResults;
  try {
    searchResults = await exaSearch(
      `${professor.name} ${professor.school} ${professor.researchArea ?? ""} research`,
      { numResults: 4 },
    );
  } catch (err) {
    console.error("Exa search failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 502 },
    );
  }

  const sourcesBlock = searchResults
    .map((r, i) => `[${i + 1}] ${r.title ?? r.url}\n${r.url}\n${r.text}`)
    .join("\n\n");

  const prompt = `Write a personalized cold-outreach email from a high school student to a professor, based on the student's saved template style below, but grounded in the real search results about the professor's actual research provided below. Reference something SPECIFIC and REAL from the search results (a project, paper, or theme) — do not invent anything not supported by the sources. If the sources don't clearly support any specific detail, keep the email more general rather than making something up.

STUDENT'S TEMPLATE STYLE (subject and body, follow this tone/structure, and keep the same placeholder tokens like {{professor_name}} for anything that isn't professor-specific research content):
Subject: ${template.subject}
Body:
${template.body}

STUDENT: ${user.name}, ${user.degreeLevel ?? "student"} at ${user.school ?? ""}, interested in ${user.areaOfStudy ?? ""}. Bio: ${user.bio ?? ""}

PROFESSOR: ${professor.name} at ${professor.school}${professor.department ? `, ${professor.department}` : ""}. Listed research area: ${professor.researchArea ?? "unknown"}.

SEARCH RESULTS ABOUT THIS PROFESSOR:
${sourcesBlock || "(no results found)"}

Respond with ONLY a fenced JSON code block: {"subject": "...", "body": "..."}. The body should be a complete, ready-to-send email (no unresolved placeholder tokens except {{professor_name}}/{{student_name}} style ones if truly unavoidable). No other text.`;

  let responseText = "";
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    responseText = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");
  } catch (err) {
    console.error("AI draft generation failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Generation failed. Please try again.",
      },
      { status: 502 },
    );
  }

  const { subject, body } = extractJson(responseText);
  if (!subject || !body) {
    return NextResponse.json(
      { error: "Couldn't generate a usable draft. Please try again." },
      { status: 502 },
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.professor.update({
      where: { id },
      data: {
        draftSubject: subject,
        draftBody: body,
        status: "DRAFTED",
        templateNameUsed: `${template.name} (AI-grounded)`,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { promptGenCount: countToday + 1, promptGenCountDate: new Date() },
    }),
  ]);

  return NextResponse.json({ professor: updated, sources: searchResults.map((r) => r.url) });
}
