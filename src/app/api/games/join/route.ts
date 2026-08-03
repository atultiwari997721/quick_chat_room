import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";
import { getEngine } from "@/lib/games/registry";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { code } = body as { code?: string };

  if (!code || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json(
      { error: "A valid 6-digit game code is required" },
      { status: 400 }
    );
  }

  const game = await prisma.game.findUnique({
    where: { code: code.trim() },
    include: { players: true },
  });
  if (!game) {
    return NextResponse.json(
      { error: "Game not found. Check the code and try again." },
      { status: 404 }
    );
  }
  const engine = getEngine(game.type);
  if (!engine) {
    return NextResponse.json({ error: "Unknown game type" }, { status: 400 });
  }
  if (game.status !== "lobby") {
    return NextResponse.json(
      { error: "This game has already started" },
      { status: 400 }
    );
  }
  if (game.players.length >= engine.maxPlayers) {
    return NextResponse.json(
      { error: "This game is full" },
      { status: 400 }
    );
  }

  let seat = game.players.length;
  let created = false;
  await prisma.gamePlayer.upsert({
    where: { gameId_userId: { gameId: game.id, userId: user.id } },
    create: { gameId: game.id, userId: user.id, seat },
    update: {},
  });
  if (game.players.findIndex((p) => p.userId === user.id) === -1) created = true;
  // ensure unique seats if user already had a seat elsewhere
  const existingSeat = game.players.find((p) => p.userId === user.id)?.seat;
  if (existingSeat !== undefined) seat = existingSeat;

  const updated = await prisma.game.findUnique({
    where: { id: game.id },
    include: {
      players: { include: { user: true }, orderBy: { seat: "asc" } },
    },
  });
  if (!updated) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  return NextResponse.json(
    {
      game: {
        ...updated,
        players: updated.players.map((p) => ({ ...p, user: toPublicUser(p.user) })),
      },
      joined: created,
    },
    { status: 201 }
  );
}