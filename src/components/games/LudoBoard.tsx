"use client";

import { useState } from "react";
import type { GameData } from "@/lib/game-types";

type LudoState = {
  tokens: number[][];
  turn: number;
  dice: number | null;
  winner: number | null;
};

const RING: [number, number][] = [];
for (let x = 0; x <= 12; x++) RING.push([0, x]);
for (let y = 1; y <= 13; y++) RING.push([y, 12]);
for (let x = 12; x >= 0; x--) RING.push([14, x]);
for (let y = 13; y >= 1; y--) RING.push([y, 0]);

const PLAYER_COLORS = [
  "bg-red-500",
  "bg-green-500",
  "bg-yellow-400",
  "bg-blue-500",
];
const PLAYER_TEXT = [
  "text-red-600 dark:text-red-400",
  "text-green-600 dark:text-green-400",
  "text-yellow-500 dark:text-yellow-400",
  "text-blue-600 dark:text-blue-400",
];

type LudoBoardProps = {
  game: GameData;
  mySeat: number | null;
  token: string;
  onMoved: () => void;
};

export function LudoBoard({ game, mySeat, token, onMoved }: LudoBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const state = game.state as LudoState;
  const myTurn = mySeat !== null && state.turn === mySeat && !state.winner;

  const sendMove = async (move: unknown) => {
    setError(null);
    const res = await fetch(`/api/games/${game.code}/move`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ move }),
    });
    if (res.ok) {
      onMoved();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Move failed");
    }
  };

  // Build a 15x13 grid (rows 0..14, cols 0..12)
  const grid: (string | undefined)[][] = Array.from({ length: 15 }, () =>
    Array(13).fill(undefined)
  );
  for (let i = 0; i < RING.length; i++) {
    grid[RING[i][0]][RING[i][1]] = "t";
  }

  const winnerName = state.winner !== null ? game.players[state.winner]?.user.name : null;
  const dice = state.dice;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {state.winner !== null
          ? `${winnerName} wins!`
          : myTurn
            ? `Your turn${dice ? ` — rolled a ${dice}` : ""}`
            : `${game.players[state.turn]?.user.name ?? "Opponent"} is playing…`}
      </p>

      <div className="rounded-xl border border-zinc-300 bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="relative">
          {grid.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell, c) => {
                if (cell !== "t") {
                  return <div key={c} className="h-6 w-6 sm:h-7 sm:w-7" />;
                }
                const idx = RING.findIndex(([rr, cc]) => rr === r && cc === c);
                const stage = Math.floor(idx / 13);
                const tokens: { seat: number; label: string }[] = [];
                for (let seat = 0; seat < game.players.length; seat++) {
                  for (let k = 0; k < 4; k++) {
                    const pos = state.tokens[seat]?.[k];
                    if (pos === undefined) continue;
                    if (pos >= 0 && pos <= 50) {
                      const abs = (seat * 13 + pos) % 52;
                      if (abs === idx) {
                        tokens.push({ seat, label: String(k + 1) });
                      }
                    }
                  }
                }
                return (
                  <div
                    key={c}
                    className={`relative flex h-6 w-6 items-center justify-center border border-zinc-200 text-[8px] font-semibold sm:h-7 sm:w-7 ${
                      tokens.length
                        ? PLAYER_COLORS[tokens[0].seat]
                        : stage % 2
                          ? "bg-zinc-50 dark:bg-zinc-800"
                          : "bg-zinc-100 dark:bg-zinc-800"
                    }`}
                  >
                    {idx % 13 === 0 && (
                      <span
                        className={`absolute -top-1 text-[6px] font-bold ${PLAYER_TEXT[stage]}`}
                      >
                        {stage === Math.floor(0 / 4) ? "S" : "A"}
                      </span>
                    )}
                    {tokens.length > 0 && (
                      <span className="text-[10px] font-bold text-white drop-shadow">
                        {tokens.length > 1 ? `×${tokens.length}` : tokens[0].label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Yard + home for each player */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {game.players.map((p, seat) => {
          const yard = (state.tokens[seat] ?? []).filter((t) => t === -1).length;
          const home = (state.tokens[seat] ?? []).filter((t) => t > 50).length;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-2 text-center ${
                state.turn === seat && !state.winner
                  ? "border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-900"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <p className={`truncate text-xs font-bold ${PLAYER_TEXT[seat]}`}>
                {p.user.name}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className={`h-3 w-3 rounded-full ${PLAYER_COLORS[seat]}`} />{" "}
                <span className="text-[10px] text-zinc-500">yard {yard}</span>
              </div>
              <p className="text-[10px] text-zinc-500">home {home}</p>
            </div>
          );
        })}
      </div>

      {myTurn &&
        !state.winner &&
        (dice === null ? (
          <button
            onClick={() => void sendMove({ roll: true })}
            className="rounded-full bg-indigo-600 px-8 py-3 text-lg font-bold text-white shadow-md transition-opacity hover:opacity-90"
          >
            🎲 Roll dice
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center gap-2 text-lg font-bold text-zinc-700 dark:text-zinc-200">
              Rolled:{" "}
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-xl shadow dark:bg-zinc-800">
                {dice}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(state.tokens[mySeat] ?? []).map((t, k) => {
                const moveable =
                  t === -1
                    ? dice === 6
                    : t >= 51
                      ? t + dice <= 57
                      : t + dice <= 56;
                return (
                  <button
                    key={k}
                    onClick={() => void (moveable && sendMove({ token: k }))}
                    disabled={!moveable}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow transition-transform ${
                      PLAYER_COLORS[mySeat]
                    } ${moveable ? "hover:scale-110 cursor-pointer" : "opacity-30"}`}
                  >
                    {k + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}