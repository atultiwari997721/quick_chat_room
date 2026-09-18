import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

function userJson(u: { id: string; name: string; avatar: string | null; createdAt: Date; username: string | null }) {
  return { ...toPublicUser(u), username: u.username ?? "" };
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [incoming, outgoing, accepted] = await Promise.all([
    prisma.follow.findMany({
      where: { followeeId: user.id, status: "pending" },
      include: { follower: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: { followerId: user.id, status: "pending" },
      include: { followee: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: {
        status: "accepted",
        OR: [{ followerId: user.id }, { followeeId: user.id }],
      },
      include: { follower: true, followee: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    incoming: incoming.map((f) => ({ ...f, follower: userJson(f.follower) })),
    outgoing: outgoing.map((f) => ({ ...f, followee: userJson(f.followee) })),
    following: accepted.map((f) => ({
      id: f.id,
      user: userJson(f.followeeId === user.id ? f.follower : f.followee),
      createdAt: f.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { targetId } = body as { targetId?: string };
  if (!targetId || targetId === user.id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let follow = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId: user.id, followeeId: targetId } },
  });

  if (!follow) {
    follow = await prisma.follow.create({
      data: { followerId: user.id, followeeId: targetId, status: "accepted" },
    });
  } else if (follow.status === "pending") {
    follow = await prisma.follow.update({
      where: { id: follow.id },
      data: { status: "accepted" },
    });
  }

  // Create or update the 1-on-1 private room
  const members = [user.id, targetId];
  let existingRoom = await prisma.room.findFirst({
    where: {
      kind: { in: ["dm", "temp_dm"] },
      members: {
        every: { userId: { in: members } },
      },
    },
  });

  if (!existingRoom) {
    const code = await (async () => {
      let c = String(Math.floor(100000 + Math.random() * 900000));
      while (await prisma.room.findUnique({ where: { code: c } })) {
        c = String(Math.floor(100000 + Math.random() * 900000));
      }
      return c;
    })();

    existingRoom = await prisma.room.create({
      data: {
        code,
        kind: "temp_dm",
        name: `${user.name} & ${target.name}`,
        adminId: null,
        members: {
          create: members.map((userId) => ({ userId })),
        },
      },
    });
  } else {
    // If it exists, extend its expiry by resetting createdAt?
    // We can't reset createdAt easily without replacing it, but we can just ensure they are in the room.
    // DMs might naturally expire after 24h of creation regardless of message activity to match "clears in 24h"
    // Wait, updating createdAt is possible:
    existingRoom = await prisma.room.update({
      where: { id: existingRoom.id },
      data: { createdAt: new Date() },
    });
    
    await Promise.all(
      members.map((userId) =>
        prisma.roomMember.upsert({
          where: { roomId_userId: { roomId: existingRoom!.id, userId } },
          create: { roomId: existingRoom!.id, userId },
          update: {},
        })
      )
    );
  }

  return NextResponse.json({ follow, room: existingRoom }, { status: 201 });
}
