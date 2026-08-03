import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id } = await params;
  if (id !== user.id) {
    return NextResponse.json(
      { error: "You can only edit your own profile" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, avatar } = body as { name?: string; avatar?: string | null };

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name !== undefined ? name.trim() : undefined,
      avatar: avatar !== undefined ? avatar : undefined,
    },
  });

  return NextResponse.json(toPublicUser(updated));
}