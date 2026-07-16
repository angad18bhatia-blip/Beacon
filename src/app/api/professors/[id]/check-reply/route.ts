import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkForReply } from "@/lib/gmail";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const professor = await prisma.professor.findUnique({ where: { id } });

  if (!professor || professor.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!professor.threadId) {
    return NextResponse.json(
      { error: "This email wasn't sent through this app, nothing to check" },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await checkForReply(
      session.user.id,
      session.user.email!,
      professor.threadId,
    );
  } catch (err) {
    console.error("Reply check failed", err);
    const message = err instanceof Error ? err.message : "";
    const looksLikeScopeIssue =
      message.includes("insufficient") || message.includes("403");
    return NextResponse.json(
      {
        error: looksLikeScopeIssue
          ? "This account hasn't granted inbox-read access yet. Sign out and sign back in to grant it."
          : "Couldn't check for a reply right now.",
      },
      { status: 502 },
    );
  }

  const updated = await prisma.professor.update({
    where: { id },
    data: result.hasReply
      ? { hasReply: true, replySnippet: result.snippet, repliedAt: result.repliedAt }
      : {},
  });

  return NextResponse.json({ professor: updated });
}
