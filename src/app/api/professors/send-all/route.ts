import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendProfessorEmail } from "@/lib/send-professor-email";

// Sends every APPROVED professor's email, one Gmail API call per professor.
// Stops early (rather than failing the whole batch) if the daily rate
// limit is hit partway through, so partial progress is preserved.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const approved = await prisma.professor.findMany({
    where: { userId: session.user.id, status: "APPROVED" },
    orderBy: { createdAt: "asc" },
  });

  const results: { id: string; name: string; ok: boolean; error?: string }[] =
    [];

  for (const professor of approved) {
    const result = await sendProfessorEmail(session.user.id, professor.id);
    if (result.ok) {
      results.push({ id: professor.id, name: professor.name, ok: true });
    } else {
      results.push({
        id: professor.id,
        name: professor.name,
        ok: false,
        error: result.error,
      });
      if (result.status === 429) break;
    }
  }

  return NextResponse.json({ results });
}
