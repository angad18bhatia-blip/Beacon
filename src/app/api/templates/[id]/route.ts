import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedTemplate(userId: string, id: string) {
  const template = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!template || template.userId !== userId) return null;
  return template;
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
  const existing = await getOwnedTemplate(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ["name", "subject", "body"] as const) {
    if (key in body) data[key] = body[key];
  }

  if (body.setActive) {
    // Only one template can be active at a time.
    await prisma.$transaction([
      prisma.emailTemplate.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      }),
      prisma.emailTemplate.update({
        where: { id },
        data: { ...data, isDefault: true },
      }),
    ]);
    const updated = await prisma.emailTemplate.findUnique({ where: { id } });
    return NextResponse.json({ template: updated });
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data,
  });
  return NextResponse.json({ template });
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
  const existing = await getOwnedTemplate(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const total = await prisma.emailTemplate.count({
    where: { userId: session.user.id },
  });
  if (total <= 1) {
    return NextResponse.json(
      { error: "You need at least one saved template" },
      { status: 400 },
    );
  }

  await prisma.emailTemplate.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.emailTemplate.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.emailTemplate.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
