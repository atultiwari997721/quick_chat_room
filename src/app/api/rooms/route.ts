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
  const { roomName, isTemporary = false } = body as { roomName?: string; isTemporary?: boolean };

  let code = generateCode();
  while (await prisma.room.findUnique({ where: { code } })) {
    code = generateCode();
  }

  const room = await prisma.room.create({
    data: {
      code,
      name: roomName?.trim() || `${user.name}'s Room`,
      adminId: user.id,
      kind: isTemporary ? "temp_group" : "group",
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

  // Lazy cleanup removed to prevent deletion desync issues where newly created rooms get deleted.

  const memberships = await prisma.roomMember.findMany({
    where: { userId: user.id },
    include: {
      room: {
        include: {
          members: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { user: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const rooms = memberships
    .map((m) => {
      const room = m.room;
      let name = room.name;
      if (room.kind === "dm" || room.kind === "temp_dm") {
        const other = room.members.find(member => member.userId !== user.id);
        if (other) {
          name = other.user.name;
        }
      }

      const last = room.messages[0];
      return {
        id: room.id,
        code: room.code,
        name,
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