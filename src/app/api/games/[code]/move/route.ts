import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";
import { getEngine } from "@/lib/games/registry";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { code } = await params;
  const body = await request.json();
  const { move } = body as { move?: unknown };

  const game = await prisma.game.findUnique({
    where: { code },
    include: { players: true },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.status !== "playing") {
    return NextResponse.json({ error: "Game is not running" }, { status: 400 });
  }
  if (!game.state) {
    return NextResponse.json({ error: "Game not initialized" }, { status: 400 });
  }

  const player = game.players.find((p) => p.userId === user.id);
  if (!player) {
    return NextResponse.json({ error: "You are not in this game" }, { status: 403 });
  }

  const engine = getEngine(game.type)!;
  const result = engine.applyMove(
    JSON.parse(JSON.stringify(game.state)),
    player.seat,
    move
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const finished = engine.isFinished(result.state as never);
  const winnerSeat = engine.winnerSeat(result.state as never);

  const updated = await prisma.game.update({
    where: { id: game.id },
    data: {
      state: result.state as object,
      ...(finished
        ? {
            status: "finished",
            winnerId: winnerSeat !== null ? game.players[winnerSeat]?.userId : null,
            finishedAt: new Date(),
          }
        : {}),
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