import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbSchema } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

  const { id } = await params;
  const body = await request.json();
  const { action, content } = body as { action?: "edit" | "toggle_permanent"; content?: string };

  const message = await prisma.message.findUnique({
    where: { id },
    include: { user: true, room: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Check room membership
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: message.roomId, userId: user.id } },
  });
  if (!membership && message.room.adminId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (action === "edit") {
    if (message.userId !== user.id) {
      return NextResponse.json({ error: "Only the author can edit this message" }, { status: 403 });
    }
    const newText = (content || "").trim();
    if (!newText) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    // Preserve attachment metadata if present
    let updatedContent = newText;
    if (!updatedContent.includes("(edited)")) {
      updatedContent = `${updatedContent} (edited)`;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content: updatedContent },
      include: { user: true },
    });

    return NextResponse.json({
      message: {
        ...updated,
        user: toPublicUser(updated.user),
      },
    });
  }

  if (action === "toggle_permanent") {
    // Toggle [KEEP] prefix to prevent 24h expiration
    let newContent = message.content;
    if (newContent.startsWith("[KEEP] ")) {
      newContent = newContent.slice(7);
    } else {
      newContent = `[KEEP] ${newContent}`;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content: newContent },
      include: { user: true },
    });

    return NextResponse.json({
      message: {
        ...updated,
        isPermanent: updated.content.startsWith("[KEEP] "),
        user: toPublicUser(updated.user),
      },
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  await ensureDbSchema();

  const { id } = await params;
  const message = await prisma.message.findUnique({
    where: { id },
    include: { room: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.userId !== user.id && message.room.adminId !== user.id) {
    return NextResponse.json({ error: "Unauthorized to delete this message" }, { status: 403 });
  }

  await prisma.message.delete({ where: { id } });

  return NextResponse.json({ success: true, deletedId: id });
}
