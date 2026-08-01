import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, avatar, roomName, id } = body as {
    name?: string;
    avatar?: string | null;
    roomName?: string;
    id?: string;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let code = generateCode();
  while (await prisma.room.findUnique({ where: { code } })) {
    code = generateCode();
  }

  const room = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { id: id || undefined, name: name.trim(), avatar: avatar || null },
    });
    const created = await tx.room.create({
      data: {
        code,
        name: roomName?.trim() || `${name.trim()}'s Room`,
        adminId: user.id,
        users: { connect: { id: user.id } },
      },
      include: { users: true },
    });
    const joined = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    return { room: created, user: joined };
  });

  return NextResponse.json(
    { room: room.room, user: room.user, url: `/?room=${room.room.code}` },
    { status: 201 }
  );
}
