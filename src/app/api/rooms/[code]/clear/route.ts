import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { code } = await params;
  const room = await prisma.room.findUnique({
    where: { code },
    include: { members: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const isMember = room.members.some((m) => m.userId === user.id);
  if (!isMember) {
    return NextResponse.json({ error: "You are not in this room" }, { status: 403 });
  }

  const result = await prisma.message.deleteMany({ where: { roomId: room.id } });
  return NextResponse.json({ ok: true, deleted: result.count });
}