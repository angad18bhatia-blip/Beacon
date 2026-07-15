import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.emailTemplate.findFirst({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ template });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, body } = await req.json();
  if (!subject || !body) {
    return NextResponse.json(
      { error: "Subject and body are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.emailTemplate.findFirst({
    where: { userId: session.user.id },
  });

  const template = existing
    ? await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: { subject, body },
      })
    : await prisma.emailTemplate.create({
        data: { userId: session.user.id, subject, body, isDefault: true },
      });

  return NextResponse.json({ template });
}
