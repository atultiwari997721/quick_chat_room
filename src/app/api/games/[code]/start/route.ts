import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";
import { getEngine } from "@/lib/games/registry";
import type { Prisma } from "@prisma/client";

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
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.adminId !== user.id) {
    return NextResponse.json({ error: "Only the admin can start the game" }, { status: 403 });
  }
  const engine = getEngine(game.type);
  if (!engine) return NextResponse.json({ error: "Unknown game type" }, { status: 400 });
  if (game.status !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }
  if (game.players.length < engine.minPlayers) {
    return NextResponse.json(
      { error: `Need at least ${engine.minPlayers} players to start` },
      { status: 400 }
    );
  }

  const updated = await prisma.game.update({
    where: { id: game.id },
    data: {
      status: "playing",
      state: engine.createState(game.players.length) as unknown as Prisma.InputJsonValue,
      startedAt: new Date(),
    },
    include: {
      players: { include: { user: true }, orderBy: { seat: "asc" } },
    },
  });

  return NextResponse.json({
    game: {
      ...updated,
      players: updated.players.map((p) => ({ ...p, user: toPublicUser(p.user) })),
    },
  });
}