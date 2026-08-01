import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code, name, avatar, id } = body as {
    code?: string;
    name?: string;
    avatar?: string | null;
    id?: string;
  };

  if (!code || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json(
      { error: "A valid 6-digit room code is required" },
      { status: 400 }
    );
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { code: code.trim() },
  });
  if (!room) {
    return NextResponse.json(
      { error: "Room not found. Check the code and try again." },
      { status: 404 }
    );
  }

  const user = await prisma.user.create({
    data: { id: id || undefined, name: name.trim(), avatar: avatar || null, roomId: room.id },
  });

  return NextResponse.json({ room, user }, { status: 201 });
}
