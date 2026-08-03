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

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId: user.id, followeeId: targetId } },
  });
  if (existing) {
    return NextResponse.json({ follow: existing });
  }

  const follow = await prisma.follow.create({
    data: { followerId: user.id, followeeId: targetId, status: "pending" },
  });
  return NextResponse.json({ follow }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { followId, accept } = body as { followId?: string; accept?: boolean };

  const follow = await prisma.follow.findUnique({
    where: { id: followId },
    include: { follower: true, followee: true },
  });
  if (!follow) {
    return NextResponse.json({ error: "Follow request not found" }, { status: 404 });
  }
  if (follow.followeeId !== user.id) {
    return NextResponse.json({ error: "Not your follow request" }, { status: 403 });
  }

  if (!accept) {
    await prisma.follow.delete({ where: { id: followId } });
    return NextResponse.json({ ok: true });
  }

  // Accept: mark accepted and open a private 1-on-1 room between the two users.
  const members = [follow.followerId, follow.followeeId];
  const existingRoom = await prisma.room.findFirst({
    where: {
      kind: "dm",
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

    const me = follow.followee;
    const them = follow.follower;
    await prisma.room.create({
      data: {
        code,
        kind: "dm",
        name: `${me.name} & ${them.name}`,
        adminId: null,
        members: {
          create: members.map((userId) => ({ userId })),
        },
      },
    });
  } else {
    const dmId = existingRoom!.id;
    await Promise.all(
      members.map((userId) =>
        prisma.roomMember.upsert({
          where: { roomId_userId: { roomId: dmId, userId } },
          create: { roomId: dmId, userId },
          update: {},
        })
      )
    );
  }

  await prisma.follow.update({
    where: { id: followId },
    data: { status: "accepted" },
  });

  const dmRoom = await prisma.room.findFirst({
    where: {
      kind: "dm",
      members: { every: { userId: { in: members } } },
    },
    include: { members: { include: { user: true } } },
  });
  if (!dmRoom) {
    return NextResponse.json({ error: "Could not open the chat" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    room: {
      ...dmRoom,
      members: dmRoom.members.map((m) => toPublicUser(m.user)),
    },
  });
}