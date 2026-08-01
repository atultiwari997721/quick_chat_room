import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      admin: true,
    },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({ room, users: room.users });
}
