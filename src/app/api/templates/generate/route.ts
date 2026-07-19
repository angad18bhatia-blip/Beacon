import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nvidiaChat } from "@/lib/nvidia";
import { extractJson } from "@/lib/extract-json";

const LLAMA_MODEL = "meta/llama-3.1-8b-instruct";
const DAILY_LIMIT = 3;

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

  if (!process.env.NVIDIA_LLAMA_API_KEY) {
    return NextResponse.json(
      { error: "The prompt generator isn't configured on this server yet (missing NVIDIA_LLAMA_API_KEY)" },
      { status: 500 },
    );
  }

  const prompt = `Write a cold-outreach email template a student (high school or college) can send to a professor about research opportunities, based on this request from the student:

"${instruction}"

Student context: ${user.degreeLevel ?? "a student"} at ${user.school ?? "their school"}, interested in ${user.areaOfStudy ?? "their field of interest"}.

The template must use these exact placeholder tokens (curly braces, verbatim) wherever the corresponding info belongs, since another program fills them in later — do not invent different placeholder names:
{{professor_name}} {{professor_school}} {{research_area}} {{student_name}} {{student_school}} {{area_of_study}} {{degree_level}} {{bio}} {{capability_note}}

{{capability_note}} is a pre-written sentence that already adapts itself to whether the student is in high school or college (asking for shadowing/small involvement vs. asking about research assistant positions directly) — use it for that part of the email instead of writing your own version of that ask.

Respond with ONLY a fenced JSON code block: {"subject": "...", "body": "..."}. No other text.`;

  let responseText = "";
  try {
    responseText = await nvidiaChat({
      apiKey: process.env.NVIDIA_LLAMA_API_KEY,
      model: LLAMA_MODEL,
      prompt,
      maxTokens: 1000,
    });
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

  const parsed = extractJson(responseText) as
    | { subject?: string; body?: string }
    | null;
  const subject = parsed?.subject;
  const body = parsed?.body;
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
