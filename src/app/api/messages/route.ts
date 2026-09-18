import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbSchema } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  await ensureDbSchema();

  // Handle 24-hour expiration for temporary rooms and DMs
  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    const isTemporary = room?.kind === "temp_group" || room?.kind === "temp_dm" || room?.name.startsWith("[TEMP] ") || room?.name.startsWith("[DM] ");
    if (isTemporary) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.message.deleteMany({
        where: {
          roomId,
          createdAt: { lt: yesterday },
          NOT: {
            content: { startsWith: "[KEEP]" },
          },
        },
      });
    }
  } catch {
    // ignore
  }

  let rawMessages: any[] = [];
  try {
    rawMessages = await prisma.message.findMany({
      where: { roomId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    try {
      rawMessages = (await prisma.$queryRawUnsafe(
        `SELECT m.id, m.content, m."userId", m."roomId", m."createdAt",
                json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar, 'createdAt', u."createdAt") as user
         FROM "Message" m
         JOIN "User" u ON m."userId" = u.id
         WHERE m."roomId" = $1
         ORDER BY m."createdAt" ASC`,
        roomId
      )) as any[];
    } catch (err) {
      console.error("Failed to query messages:", err);
      return NextResponse.json([]);
    }
  }

  const messages = rawMessages.map((m: any) => {
    let fileUrl = m.fileUrl ?? null;
    let fileName = m.fileName ?? null;
    let fileType = m.fileType ?? null;
    let fileSize = m.fileSize ?? null;
    let content = m.content || "";

    const isPermanent = content.startsWith("[KEEP] ");
    if (isPermanent) {
      content = content.slice(7);
    }

    if (!fileUrl && typeof content === "string" && content.startsWith("[ATTACHMENT:")) {
      const match = content.match(/^\[ATTACHMENT:(\{.*?\})\](?:\n([\s\S]*))?$/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          fileUrl = parsed.fileUrl;
          fileName = parsed.fileName;
          fileType = parsed.fileType;
          fileSize = parsed.fileSize;
          content = match[2] || (fileName ? `📎 ${fileName}` : "📎 Attachment");
        } catch {
          // ignore
        }
      }
    }

    return {
      id: m.id,
      content,
      fileUrl,
      fileName,
      fileType,
      fileSize,
      isPermanent,
      userId: m.userId,
      roomId: m.roomId,
      createdAt: m.createdAt,
      user: toPublicUser(m.user),
    };
  });

  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

  const body = await request.json();
  const { content, roomId, fileUrl, fileName, fileType, fileSize } = body as {
    content?: string;
    roomId?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  };

  const text = (content ?? "").trim();
  const hasFile = Boolean(fileUrl && fileUrl.trim());

  if ((!text && !hasFile) || !roomId) {
    return NextResponse.json(
      { error: "Content or file and roomId are required" },
      { status: 400 }
    );
  }

  let membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!membership) {
    const r = await prisma.room.findUnique({ where: { id: roomId } }).catch(() => null);
    if (r) {
      membership = await prisma.roomMember.create({
        data: { roomId, userId: user.id },
      }).catch(() => null);
    }
  }

  if (!membership) {
    return NextResponse.json(
      { error: "You are not in this room" },
      { status: 403 }
    );
  }

  const finalContent = text || (fileName ? `📎 ${fileName}` : "📎 Attachment");

  let message: any;
  try {
    message = await prisma.message.create({
      data: {
        content: finalContent,
        fileUrl: fileUrl?.trim() || null,
        fileName: fileName?.trim() || null,
        fileType: fileType?.trim() || null,
        fileSize: typeof fileSize === "number" ? fileSize : null,
        userId: user.id,
        roomId,
      },
      include: { user: true },
    });
  } catch {
    // If standard create fails (e.g. column mismatch), try fallback or raw insert
    try {
      const fallbackContent = hasFile
        ? `[ATTACHMENT:${JSON.stringify({ fileUrl, fileName, fileType, fileSize })}]${text ? `\n${text}` : ""}`
        : finalContent;
      const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Message" ("id", "content", "userId", "roomId", "createdAt") VALUES ($1, $2, $3, $4, NOW())`,
        id,
        fallbackContent,
        user.id,
        roomId
      );
      message = {
        id,
        content: fallbackContent,
        userId: user.id,
        roomId,
        createdAt: new Date(),
        user,
      };
    } catch (insertErr) {
      console.error("Failed to insert message:", insertErr);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      ...message,
      content: text || (fileName ? `📎 ${fileName}` : "📎 Attachment"),
      user: toPublicUser(message.user || user),
    },
    { status: 201 }
  );
}