import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedProfessor(userId: string, id: string) {
  const professor = await prisma.professor.findUnique({ where: { id } });
  if (!professor || professor.userId !== userId) return null;
  return professor;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedProfessor(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status === "SENT") {
    return NextResponse.json(
      { error: "This email has already been sent and can't be edited" },
      { status: 409 },
    );
  }

  const body = await req.json();
  const allowed = [
    "name",
    "email",
    "school",
    "department",
    "researchArea",
    "notes",
    "draftSubject",
    "draftBody",
    "status",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  // Only allow moving between the non-terminal statuses here; sending is
  // handled by the dedicated /send endpoint so it can enforce idempotency.
  if (data.status === "SENT") {
    return NextResponse.json(
      { error: "Use the send endpoint to send an email" },
      { status: 400 },
    );
  }

  const professor = await prisma.professor.update({ where: { id }, data });
  return NextResponse.json({ professor });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getOwnedProfessor(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.professor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
