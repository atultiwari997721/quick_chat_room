import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { code } = await params;
  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: true },
  });
  if (!game) return NextResponse.json({ ok: true });

  if (game.status === "lobby") {
    if (game.adminId === user.id) {
      await prisma.game.delete({ where: { id: game.id } });
    } else {
      await prisma.gamePlayer.deleteMany({
        where: { gameId: game.id, userId: user.id },
      });
      const remaining = game.players.filter((p) => p.userId !== user.id);
      if (remaining.length === 0) {
        await prisma.game.delete({ where: { id: game.id } });
      }
    }
  } else {
    await prisma.gamePlayer.deleteMany({
      where: { gameId: game.id, userId: user.id },
    });
  }

  return NextResponse.json({ ok: true });
}