import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SUBJECT_TEMPLATE,
  DEFAULT_BODY_TEMPLATE,
} from "@/lib/template";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { school, degreeLevel, areaOfStudy, bio } = await req.json();

  if (!school || !degreeLevel || !areaOfStudy || !bio) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { school, degreeLevel, areaOfStudy, bio, onboarded: true },
  });

  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: { userId: session.user.id },
  });

  if (!existingTemplate) {
    await prisma.emailTemplate.create({
      data: {
        userId: session.user.id,
        name: "Default",
        subject: DEFAULT_SUBJECT_TEMPLATE,
        body: DEFAULT_BODY_TEMPLATE,
        isDefault: true,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
