import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.emailTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, subject, body, source } = await req.json();
  if (!name || !subject || !body) {
    return NextResponse.json(
      { error: "Name, subject, and body are required" },
      { status: 400 },
    );
  }

  const existingCount = await prisma.emailTemplate.count({
    where: { userId: session.user.id },
  });

  const template = await prisma.emailTemplate.create({
    data: {
      userId: session.user.id,
      name,
      subject,
      body,
      // first template a user ever gets is automatically the active one
      isDefault: existingCount === 0,
      source: source === "ai_generated" ? "ai_generated" : "manual",
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
