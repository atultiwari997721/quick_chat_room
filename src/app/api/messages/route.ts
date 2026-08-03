import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

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
  return NextResponse.json(
    messages.map((m) => ({ ...m, user: toPublicUser(m.user) }))
  );
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { content, roomId } = body as { content?: string; roomId?: string };

  if (!content || !content.trim() || !roomId) {
    return NextResponse.json(
      { error: "content and roomId are required" },
      { status: 400 }
    );
  }

  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "You are not in this room" },
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

  return NextResponse.json(
    { ...message, user: toPublicUser(message.user) },
    { status: 201 }
  );
}