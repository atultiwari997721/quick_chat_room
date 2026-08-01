import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const messages = await prisma.message.findMany({
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, userName } = body as { content?: string; userName?: string };

  if (!content || !content.trim() || !userName || !userName.trim()) {
    return NextResponse.json(
      { error: "content and userName are required" },
      { status: 400 }
    );
  }

  let user = await prisma.user.findFirst({
    where: { name: userName.trim() },
  });
  if (!user) {
    user = await prisma.user.create({ data: { name: userName.trim() } });
  }

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      userId: user.id,
    },
    include: { user: true },
  });

  return NextResponse.json(message, { status: 201 });
}
