import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendProfessorEmail } from "@/lib/send-professor-email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await sendProfessorEmail(session.user.id, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ professor: result.professor });
}
