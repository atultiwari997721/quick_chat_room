import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbSchema } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

function userJson(u: { id: string; name: string; avatar: string | null; createdAt: Date; username: string | null }) {
  return { ...toPublicUser(u), username: u.username ?? "" };
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

  try {
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
  } catch (err) {
    console.error("Error loading follows:", err);
    return NextResponse.json({ incoming: [], outgoing: [], following: [] });
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

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
      data: { followerId: user.id, followeeId: targetId, status: "pending" },
    });
  }

  return NextResponse.json({ follow }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

  const body = await request.json();
  const { followId, accept } = body as { followId?: string; accept?: boolean };
  if (!followId || typeof accept !== "boolean") {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const follow = await prisma.follow.findUnique({
    where: { id: followId },
    include: { follower: true, followee: true },
  });

  if (!follow || follow.followeeId !== user.id) {
    return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
  }

  if (!accept) {
    await prisma.follow.delete({ where: { id: follow.id } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const updated = await prisma.follow.update({
    where: { id: follow.id },
    data: { status: "accepted" },
  });

  // Create or update the 1-on-1 private room
  const members = [follow.followerId, follow.followeeId];
  let existingRoom;
  try {
    existingRoom = await prisma.room.findFirst({
      where: {
        kind: { in: ["dm", "temp_dm"] },
        members: {
          every: { userId: { in: members } },
        },
      },
    });
  } catch (err: any) {
    if (err?.code === "P2021" || err?.message?.includes("column") || err?.message?.includes("kind")) {
      existingRoom = await prisma.room.findFirst({
        where: {
          name: { startsWith: "[DM] " },
          members: {
            every: { userId: { in: members } },
          },
        },
      });
    } else {
      throw err;
    }
  }

  if (!existingRoom) {
    const code = await (async () => {
      let c = String(Math.floor(100000 + Math.random() * 900000));
      while (await prisma.room.findUnique({ where: { code: c } })) {
        c = String(Math.floor(100000 + Math.random() * 900000));
      }
      return c;
    })();

    try {
      existingRoom = await prisma.room.create({
        data: {
          code,
          kind: "temp_dm",
          name: `${follow.follower.name} & ${follow.followee.name}`,
          adminId: null,
          members: {
            create: members.map((userId) => ({ userId })),
          },
        },
      });
    } catch (err: any) {
      if (err?.code === "P2021" || err?.message?.includes("column") || err?.message?.includes("kind")) {
        existingRoom = await prisma.room.create({
          data: {
            code,
            name: `[DM] ${follow.follower.name} & ${follow.followee.name}`,
            adminId: null,
            members: {
              create: members.map((userId) => ({ userId })),
            },
          },
        });
        (existingRoom as any).kind = "temp_dm";
      } else {
        throw err;
      }
    }
  } else {
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

  return NextResponse.json({ follow: updated, room: existingRoom });
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

  const body = await request.json();
  const { targetId } = body as { targetId?: string };

  if (!targetId) {
    return NextResponse.json({ error: "Target ID required" }, { status: 400 });
  }

  // Delete the follow relationship
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: user.id, followeeId: targetId },
        { followerId: targetId, followeeId: user.id },
      ],
    },
  });

  return NextResponse.json({ success: true });
}
