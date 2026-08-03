import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { roomName } = body as { roomName?: string };

  let code = generateCode();
  while (await prisma.room.findUnique({ where: { code } })) {
    code = generateCode();
  }

  const room = await prisma.room.create({
    data: {
      code,
      name: roomName?.trim() || `${user.name}'s Room`,
      adminId: user.id,
      members: { create: { userId: user.id } },
    },
    include: { members: { include: { user: true } } },
  });

  const members = room.members.map((m) => toPublicUser(m.user));
  return NextResponse.json(
    {
      room: { ...room, members },
      user: toPublicUser(user),
      url: `/?room=${room.code}`,
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const memberships = await prisma.roomMember.findMany({
    where: { userId: user.id },
    include: {
      room: {
        include: {
          members: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { user: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const rooms = memberships
    .map((m) => {
      const room = m.room;
      const last = room.messages[0];
      return {
        id: room.id,
        code: room.code,
        name: room.name,
        kind: room.kind,
        adminId: room.adminId,
        createdAt: room.createdAt.toISOString(),
        memberCount: room.members.length,
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              author: last.user.name,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const ta = a.lastMessage?.createdAt ?? a.createdAt;
      const tb = b.lastMessage?.createdAt ?? b.createdAt;
      return tb.localeCompare(ta);
    });

  return NextResponse.json({ rooms });
}