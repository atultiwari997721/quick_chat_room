import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbSchema } from "@/lib/prisma";
import { toPublicUser } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  await ensureDbSchema();

  try {
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
  } catch (err) {
    console.error("Error fetching room by code:", err);
    return NextResponse.json({ error: "Failed to load room" }, { status: 500 });
  }
}