import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toPublicUser } from "@/lib/serialize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const game = await prisma.game.findUnique({
    where: { code },
    include: {
      players: { include: { user: true }, orderBy: { seat: "asc" } },
    },
  });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json({
    game: {
      ...game,
      state: game.state,
      players: game.players.map((p) => ({ ...p, user: toPublicUser(p.user) })),
    },
  });
}