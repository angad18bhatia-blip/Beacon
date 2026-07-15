import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const professors = await prisma.professor.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ professors });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, school, department, researchArea, notes } =
    await req.json();

  if (!name || !email || !school) {
    return NextResponse.json(
      { error: "Name, email, and school are required" },
      { status: 400 },
    );
  }

  const professor = await prisma.professor.create({
    data: {
      userId: session.user.id,
      name,
      email,
      school,
      department: department || null,
      researchArea: researchArea || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ professor }, { status: 201 });
}
