import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkForReply } from "@/lib/gmail";

// Bulk version of check-reply: loops over every sent professor with a
// thread on file. On-demand only (no cron/background job in this app) —
// call it from the dashboard when you want a fresh check.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await prisma.professor.findMany({
    where: { userId: session.user.id, status: "SENT", threadId: { not: null } },
  });

  let newReplies = 0;
  let checked = 0;
  let scopeError = false;

  for (const professor of sent) {
    try {
      const result = await checkForReply(
        session.user.id,
        session.user.email!,
        professor.threadId!,
      );
      checked++;
      if (result.hasReply && !professor.hasReply) {
        newReplies++;
        await prisma.professor.update({
          where: { id: professor.id },
          data: {
            hasReply: true,
            replySnippet: result.snippet,
            repliedAt: result.repliedAt,
          },
        });
      }
    } catch (err) {
      console.error("Reply check failed for", professor.id, err);
      const message = err instanceof Error ? err.message : "";
      if (message.includes("insufficient") || message.includes("403")) {
        scopeError = true;
        break;
      }
    }
  }

  if (scopeError) {
    return NextResponse.json(
      {
        error:
          "This account hasn't granted inbox-read access yet. Sign out and sign back in to grant it.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ checked, newReplies });
}
