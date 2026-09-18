import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicUser } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  // Lazily cleanup using DB clock
  await prisma.$executeRaw`DELETE FROM "Room" WHERE "kind" LIKE 'temp_%' AND "createdAt" < NOW() - INTERVAL '1 day'`;

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