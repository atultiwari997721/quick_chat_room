import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { code } = body as { code?: string };

  if (!code || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json(
      { error: "A valid 6-digit room code is required" },
      { status: 400 }
    );
  }

  // Lazy cleanup removed

  const room = await prisma.room.findUnique({
    where: { code: code.trim() },
  });
  if (!room) {
    return NextResponse.json(
      { error: "Room not found. Check the code and try again." },
      { status: 404 }
    );
  }

  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId: user.id } },
    create: { roomId: room.id, userId: user.id },
    update: {},
  });

  const updated = await prisma.room.findUnique({
    where: { id: room.id },
    include: {
      members: { include: { user: true }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!updated) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const members = updated.members.map((m) => toPublicUser(m.user));
  return NextResponse.json(
    { room: { ...updated, members }, user: toPublicUser(user) },
    { status: 201 }
  );
}