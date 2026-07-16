import { prisma } from "@/lib/prisma";
import { sendGmail } from "@/lib/gmail";
import type { ProfessorModel } from "@/generated/prisma/models";

const DAILY_SEND_LIMIT = 40;

export type SendResult =
  | { ok: true; professor: ProfessorModel; alreadySent: boolean }
  | { ok: false; error: string; status: number };

// Shared by the single-professor send route and the "send all approved"
// bulk action, so both paths get the same idempotency and rate-limit
// guarantees instead of drifting apart.
export async function sendProfessorEmail(
  userId: string,
  professorId: string,
): Promise<SendResult> {
  const [professor, user] = await Promise.all([
    prisma.professor.findUnique({ where: { id: professorId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!professor || professor.userId !== userId || !user) {
    return { ok: false, error: "Not found", status: 404 };
  }

  if (professor.status === "SENT") {
    return { ok: true, professor, alreadySent: true };
  }

  if (!professor.draftSubject || !professor.draftBody) {
    return {
      ok: false,
      error: "Generate and review a draft before sending",
      status: 400,
    };
  }

  const today = new Date().toDateString();
  const lastSendDay = user.sendCountDate
    ? new Date(user.sendCountDate).toDateString()
    : null;
  const sendCountToday = lastSendDay === today ? user.sendCount : 0;

  if (sendCountToday >= DAILY_SEND_LIMIT) {
    return {
      ok: false,
      error: `You've hit today's limit of ${DAILY_SEND_LIMIT} emails. Please try again tomorrow.`,
      status: 429,
    };
  }

  let sendResult;
  try {
    sendResult = await sendGmail({
      userId: user.id,
      fromName: user.name,
      fromEmail: user.email!,
      toEmail: professor.email,
      toName: professor.name,
      subject: professor.draftSubject,
      body: professor.draftBody,
    });
  } catch (err) {
    console.error("Gmail send failed", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to send email via Gmail",
      status: 502,
    };
  }

  const [updatedProfessor] = await prisma.$transaction([
    prisma.professor.update({
      where: { id: professorId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        gmailMessageId: sendResult.id ?? null,
        threadId: sendResult.threadId ?? null,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        sendCount: sendCountToday + 1,
        sendCountDate: new Date(),
      },
    }),
  ]);

  return { ok: true, professor: updatedProfessor, alreadySent: false };
}
