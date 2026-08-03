"use client";

import { useState } from "react";
import type { GameData } from "@/lib/game-types";

type ChessState = {
  board: (null | { type: string; color: number })[][];
  turn: number;
  winner: number | null;
  check: boolean;
  stalemate: boolean;
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const GLYPHS: Record<string, [string, string]> = {
  p: ["♙", "♟"],
  r: ["♖", "♜"],
  n: ["♘", "♞"],
  b: ["♗", "♝"],
  q: ["♕", "♛"],
  k: ["♔", "♚"],
};

type ChessBoardProps = {
  game: GameData;
  mySeat: number | null;
  token: string;
  onMoved: () => void;
};

export function ChessBoard({ game, mySeat, token, onMoved }: ChessBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const state = game.state as ChessState;
  const myTurn = mySeat !== null && state.turn === mySeat && state.winner === null && !state.stalemate;

  const click = async (r: number, c: number) => {
    if (!myTurn) return;
    setError(null);
    const board = state.board;
    const piece = board[r][c];

    if (!selected) {
      if (piece && String(piece.color) === String(mySeat)) {
        setSelected([r, c]);
      }
      return;
    }
    if (selected[0] === r && selected[1] === c) {
      setSelected(null);
      return;
    }

    const res = await fetch(`/api/games/${game.code}/move`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ move: { from: selected, to: [r, c] } }),
    });
    if (res.ok) {
      setSelected(null);
      onMoved();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Illegal move");
      setSelected(null);
    }
  };

  const winnerName = state.winner !== null ? game.players[state.winner]?.user.name : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {state.winner !== null
          ? `${winnerName} wins!`
          : state.stalemate
            ? "Stalemate — draw!"
            : myTurn
              ? state.check
                ? "Your turn — you are in check!"
                : "Your turn — move a piece"
              : `${game.players[state.turn]?.user.name ?? "Opponent"}${
                  state.check ? " is in check" : ""
                } is thinking…`}
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-300 shadow-sm dark:border-zinc-700">
        <div className="min-w-[360px] select-none">
          {state.board.map((row, r) => (
            <div key={r} className="flex">
              {row.map((piece, c) => {
                const dark = (r + c) % 2 === 1;
                const isSelected =
                  selected && selected[0] === r && selected[1] === c;
                return (
                  <button
                    key={c}
                    onClick={() => void click(r, c)}
                    disabled={!myTurn}
                    className={`flex h-11 w-11 items-center justify-center text-3xl sm:h-14 sm:w-14 sm:text-4xl ${
                      dark ? "bg-zinc-700" : "bg-zinc-100"
                    } ${isSelected ? "ring-2 ring-inset ring-amber-400" : ""} ${
                      myTurn ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    {piece && (
                      <span
                        className={`${
                          String(piece.color) === "0"
                            ? "text-zinc-50 drop-shadow"
                            : "text-zinc-950"
                        }`}
                      >
                        {GLYPHS[piece.type]?.[Number(piece.color)]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 font-mono text-xs text-zinc-500">
        <div className="flex gap-3">{FILES.map((f) => <span key={f}>{f}</span>)}</div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}