import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplate } from "@/lib/template";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { templateId } = await req.json().catch(() => ({ templateId: undefined }));

  const [professor, user] = await Promise.all([
    prisma.professor.findUnique({ where: { id } }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  if (!professor || professor.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (professor.status === "SENT") {
    return NextResponse.json(
      { error: "This email has already been sent" },
      { status: 409 },
    );
  }

  const template = templateId
    ? await prisma.emailTemplate.findUnique({ where: { id: templateId } })
    : await prisma.emailTemplate.findFirst({
        where: { userId: session.user.id, isDefault: true },
      });

  if (!user || !template || template.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Complete onboarding first" },
      { status: 400 },
    );
  }

  const fields = {
    professor_name: professor.name,
    professor_school: professor.school,
    research_area: professor.researchArea || "your work",
    student_name: user.name || "",
    student_school: user.school || "",
    area_of_study: user.areaOfStudy || "",
    degree_level: (user.degreeLevel || "").toLowerCase(),
    bio: user.bio || "",
  };

  const draftSubject = renderTemplate(template.subject, fields);
  const draftBody = renderTemplate(template.body, fields);

  const updated = await prisma.professor.update({
    where: { id },
    data: {
      draftSubject,
      draftBody,
      status: "DRAFTED",
      templateNameUsed: template.name,
    },
  });

  return NextResponse.json({ professor: updated });
}
