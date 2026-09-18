import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicUser } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.room.deleteMany({
    where: {
      kind: { startsWith: "temp_" },
      createdAt: { lt: yesterday },
    },
  });

  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      members: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const members = room.members.map((m) => toPublicUser(m.user));
  return NextResponse.json({
    room: { ...room, members },
  });
}