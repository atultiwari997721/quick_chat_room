import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  let rawMessages;
  try {
    rawMessages = await prisma.message.findMany({
      where: { roomId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error?.code === "P2021" || error?.message?.includes("column")) {
      // Fallback if remote DB hasn't been migrated yet
      rawMessages = (await prisma.$queryRawUnsafe(
        `SELECT m.id, m.content, m."userId", m."roomId", m."createdAt",
                json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar, 'createdAt', u."createdAt") as user
         FROM "Message" m
         JOIN "User" u ON m."userId" = u.id
         WHERE m."roomId" = $1
         ORDER BY m."createdAt" ASC`,
        roomId
      )) as Array<{
        id: string;
        content: string;
        userId: string;
        roomId: string;
        createdAt: string;
        user: Parameters<typeof toPublicUser>[0];
      }>;
    } else {
      throw err;
    }
  }

  const messages = rawMessages.map((m: {
    id: string;
    content: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    userId: string;
    roomId: string;
    createdAt: Date | string;
    user: Parameters<typeof toPublicUser>[0];
  }) => {
    let fileUrl = m.fileUrl ?? null;
    let fileName = m.fileName ?? null;
    let fileType = m.fileType ?? null;
    let fileSize = m.fileSize ?? null;
    let content = m.content;

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

  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "You are not in this room" },
      { status: 403 }
    );
  }

  const finalContent = text || (fileName ? `📎 ${fileName}` : "📎 Attachment");

  let message;
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
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error?.code === "P2021" || error?.message?.includes("column")) {
      const fallbackContent = hasFile
        ? `[ATTACHMENT:${JSON.stringify({ fileUrl, fileName, fileType, fileSize })}]${text ? `\n${text}` : ""}`
        : finalContent;
      const created = await prisma.message.create({
        data: {
          content: fallbackContent,
          userId: user.id,
          roomId,
        },
        include: { user: true },
      });
      message = {
        ...created,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
      };
    } else {
      throw err;
    }
  }

  return NextResponse.json(
    {
      ...message,
      content: text || (fileName ? `📎 ${fileName}` : "📎 Attachment"),
      user: toPublicUser(message.user),
    },
    { status: 201 }
  );
}