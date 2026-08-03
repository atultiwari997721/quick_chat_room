import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const admin = await requireUser(request);
  if (!admin) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { code } = await params;
  const body = await request.json();
  const { userId } = body as { userId?: string };

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.adminId !== admin.id) {
    return NextResponse.json(
      { error: "Only the room admin can remove users" },
      { status: 403 }
    );
  }

  await prisma.roomMember.deleteMany({
    where: { roomId: room.id, userId },
  });

  const updated = await prisma.room.findUnique({
    where: { code },
    include: {
      members: { include: { user: true }, orderBy: { joinedAt: "asc" } },
    },
  });

  return NextResponse.json({
    users: updated?.members.map((m) => toPublicUser(m.user)) ?? [],
  });
}