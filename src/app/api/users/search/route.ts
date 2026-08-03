import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const byId = request.nextUrl.searchParams.get("id");

  if (byId) {
    const target = await prisma.user.findUnique({
      where: { id: byId },
    });
    if (!target || target.id === user.id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      user: { ...toPublicUser(target), username: target.username ?? "" },
    });
  }

  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 25,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({ ...toPublicUser(u), username: u.username ?? "" })),
  });
}
