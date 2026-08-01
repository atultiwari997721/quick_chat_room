import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, avatar } = body as { name?: string; avatar?: string | null };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(typeof avatar === "string" || avatar === null ? { avatar } : {}),
    },
  });

  return NextResponse.json(updated);
}
