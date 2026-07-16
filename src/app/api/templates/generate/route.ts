import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";

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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { instruction } = await req.json();
  if (!instruction || typeof instruction !== "string") {
    return NextResponse.json(
      { error: "Describe what you want the prompt to say" },
      { status: 400 },
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
        error: `You've hit today's limit of ${DAILY_LIMIT} AI generations. Please try again tomorrow.`,
      },
      { status: 429 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The prompt generator isn't configured on this server yet (missing ANTHROPIC_API_KEY)" },
      { status: 500 },
    );
  }

  const prompt = `Write a cold-outreach email template a high school student can send to a professor about research opportunities, based on this request from the student:

"${instruction}"

Student context: ${user.degreeLevel ?? "a high school"} student at ${user.school ?? "their school"}, interested in ${user.areaOfStudy ?? "their field of interest"}.

The template must use these exact placeholder tokens (curly braces, verbatim) wherever the corresponding info belongs, since another program fills them in later — do not invent different placeholder names:
{{professor_name}} {{professor_school}} {{research_area}} {{student_name}} {{student_school}} {{area_of_study}} {{degree_level}} {{bio}}

Respond with ONLY a fenced JSON code block: {"subject": "...", "body": "..."}. No other text.`;

  let responseText = "";
  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    responseText = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n");
  } catch (err) {
    console.error("Prompt generation failed", err);
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
      { error: "Couldn't generate a usable template. Please try rephrasing." },
      { status: 502 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { promptGenCount: countToday + 1, promptGenCountDate: new Date() },
  });

  return NextResponse.json({ subject, body });
}
