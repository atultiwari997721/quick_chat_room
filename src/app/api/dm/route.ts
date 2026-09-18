import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbSchema } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

  const body = await request.json();
  const { targetId } = body as { targetId?: string };

  if (!targetId || targetId === user.id) {
    return NextResponse.json({ error: "Invalid target user" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const memberIds = [user.id, targetId];

  // Look for existing DM room
  let room: any = null;
  try {
    const userMemberships = await prisma.roomMember.findMany({
      where: { userId: user.id },
      include: {
        room: {
          include: {
            members: { include: { user: true } },
          },
        },
      },
    });

    const dmMembership = userMemberships.find((m) => {
      const r = m.room;
      const isDm = r.kind === "dm" || r.kind === "temp_dm" || r.name.startsWith("[DM] ");
      const hasTarget = r.members.some((mem) => mem.userId === targetId);
      return isDm && hasTarget;
    });

    if (dmMembership) {
      room = dmMembership.room;
    }
  } catch (err) {
    console.error("Error finding existing DM room:", err);
  }

  // If not found, create new DM room
  if (!room) {
    let code = generateCode();
    try {
      while (await prisma.room.findUnique({ where: { code } })) {
        code = generateCode();
      }
    } catch {
      // ignore
    }

    try {
      room = await prisma.room.create({
        data: {
          code,
          name: `${user.name} & ${target.name}`,
          kind: "temp_dm",
          adminId: user.id,
          members: {
            create: memberIds.map((userId) => ({ userId })),
          },
        },
        include: {
          members: { include: { user: true } },
        },
      });
    } catch {
      // Fallback if kind column is missing
      room = await prisma.room.create({
        data: {
          code,
          name: `[DM] ${user.name} & ${target.name}`,
          adminId: user.id,
          members: {
            create: memberIds.map((userId) => ({ userId })),
          },
        },
        include: {
          members: { include: { user: true } },
        },
      });
      room.kind = "temp_dm";
    }
  }

  // Ensure both are members
  await Promise.all(
    memberIds.map((userId) =>
      prisma.roomMember.upsert({
        where: { roomId_userId: { roomId: room.id, userId } },
        create: { roomId: room.id, userId },
        update: {},
      }).catch(() => null)
    )
  );

  const members = room.members.map((m: any) => toPublicUser(m.user));
  return NextResponse.json({
    room: {
      ...room,
      name: target.name,
      members,
    },
  });
}
