import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }
  const messages = await prisma.message.findMany({
    where: { roomId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, roomId, userId } = body as {
    content?: string;
    roomId?: string;
    userId?: string;
  };

  if (!content || !content.trim() || !roomId || !userId) {
    return NextResponse.json(
      { error: "content, roomId, and userId are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.roomId !== roomId) {
    return NextResponse.json(
      { error: "User is not in this room" },
      { status: 403 }
    );
  }

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      userId: user.id,
      roomId,
    },
    include: { user: true },
  });

  return NextResponse.json(message, { status: 201 });
}
