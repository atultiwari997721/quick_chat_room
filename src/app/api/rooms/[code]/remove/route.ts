import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { adminId, userId } = body as { adminId?: string; userId?: string };

  if (!adminId || !userId) {
    return NextResponse.json(
      { error: "adminId and userId are required" },
      { status: 400 }
    );
  }

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.adminId !== adminId) {
    return NextResponse.json(
      { error: "Only the room admin can remove users" },
      { status: 403 }
    );
  }

  await prisma.user.delete({ where: { id: userId } });

  const updated = await prisma.room.findUnique({
    where: { code },
    include: { users: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ users: updated?.users ?? [] });
}
