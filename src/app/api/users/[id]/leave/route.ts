import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { roomId } = body as { roomId?: string };
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ ok: true });
  }

  if (room.adminId === user.id) {
    await prisma.room.delete({ where: { id: room.id } });
  } else {
    await prisma.roomMember.deleteMany({
      where: { roomId: room.id, userId: user.id },
    });
  }

  return NextResponse.json({ ok: true });
}