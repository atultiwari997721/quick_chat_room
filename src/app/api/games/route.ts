import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";
import { getEngine } from "@/lib/games/registry";
import { GAME_META } from "@/lib/games/engine";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { type, name } = body as { type?: string; name?: string };
  if (!type || !getEngine(type)) {
    return NextResponse.json({ error: "Unknown game type" }, { status: 400 });
  }

  let code = generateCode();
  while (await prisma.game.findUnique({ where: { code } })) {
    code = generateCode();
  }

  const game = await prisma.game.create({
    data: {
      code,
      type,
      name: name?.trim() || `${GAME_META[type as keyof typeof GAME_META]?.name ?? "Game"}`,
      adminId: user.id,
      players: { create: { userId: user.id, seat: 0 } },
    },
    include: {
      players: { include: { user: true }, orderBy: { seat: "asc" } },
    },
  });

  const players = game.players.map((p) => ({
    ...p,
    user: toPublicUser(p.user),
  }));
  return NextResponse.json({ game: { ...game, players } }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const games = await prisma.game.findMany({
    where: {
      players: { some: { userId: user.id } },
      status: { in: ["lobby", "playing"] },
    },
    include: {
      players: { include: { user: true }, orderBy: { seat: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = games.map((g) => ({
    ...g,
    players: g.players.map((p) => ({ ...p, user: toPublicUser(p.user) })),
  }));

  return NextResponse.json({ games: mapped });
}