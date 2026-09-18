import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbSchema } from "@/lib/prisma";

const ADMIN_USER = "atultiwari997721";
const ADMIN_PASS = "shreyatul997721";

export async function POST(request: NextRequest) {
  await ensureDbSchema();

  try {
    const body = await request.json();
    const { username, password, action, targetUserId, targetRoomId } = body as {
      username?: string;
      password?: string;
      action?: "stats" | "delete_user" | "delete_room";
      targetUserId?: string;
      targetRoomId?: string;
    };

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return NextResponse.json({ error: "Access Denied: Invalid credentials" }, { status: 401 });
    }

    if (action === "delete_user" && targetUserId) {
      await prisma.user.delete({ where: { id: targetUserId } }).catch(() => null);
      return NextResponse.json({ success: true, deletedUserId: targetUserId });
    }

    if (action === "delete_room" && targetRoomId) {
      await prisma.room.delete({ where: { id: targetRoomId } }).catch(() => null);
      return NextResponse.json({ success: true, deletedRoomId: targetRoomId });
    }

    // Default: fetch admin statistics and tables
    const [userCount, roomCount, messageCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.room.count().catch(() => 0),
      prisma.message.count().catch(() => 0),
    ]);

    const users = await prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
            messages: true,
            adminRooms: true,
          },
        },
      },
    }).catch(() => []);

    const rooms = await prisma.room.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        kind: true,
        createdAt: true,
        adminId: true,
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    }).catch(() => []);

    return NextResponse.json({
      stats: {
        userCount,
        roomCount,
        messageCount,
        dbStatus: "Connected",
        uptime: process.uptime(),
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username || "Anonymous",
        createdAt: u.createdAt.toISOString(),
        roomCount: u._count.memberships,
        messageCount: u._count.messages,
        adminRooms: u._count.adminRooms,
      })),
      rooms: rooms.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        kind: r.kind,
        createdAt: r.createdAt.toISOString(),
        memberCount: r._count.members,
        messageCount: r._count.messages,
      })),
    });
  } catch (error) {
    console.error("Admin power API error:", error);
    return NextResponse.json({ error: "Server error occurred" }, { status: 500 });
  }
}
