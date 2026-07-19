import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { discoverWhere, DISCOVER_PAGE_SIZE } from "@/lib/discover-search";

// Backs the Discover page's "Show more" button — same filter logic as
// the page's own server-side query, just offset by however many rows
// are already on screen.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const skip = Number(searchParams.get("skip") ?? "0");

  const results = await prisma.researcherDatabase.findMany({
    where: discoverWhere(q),
    orderBy: { name: "asc" },
    skip: Number.isFinite(skip) && skip > 0 ? skip : 0,
    take: DISCOVER_PAGE_SIZE,
  });

  return NextResponse.json({ results });
}
