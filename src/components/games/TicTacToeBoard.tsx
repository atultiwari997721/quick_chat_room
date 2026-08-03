"use client";

import { useState } from "react";
import type { GameData } from "@/lib/game-types";

type TicTacToeState = {
  board: (string | null)[];
  turn: number;
  winner: number | null;
  draw: boolean;
};

type TicTacToeBoardProps = {
  game: GameData;
  mySeat: number | null;
  token: string;
  onMoved: () => void;
};

export function TicTacToeBoard({ game, mySeat, token, onMoved }: TicTacToeBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const state = game.state as TicTacToeState;
  const myTurn = mySeat !== null && state.turn === mySeat && state.winner === null && !state.draw;
  const done = state.winner !== null || state.draw;

  const click = async (cell: number) => {
    if (!myTurn || state.board[cell] !== null) return;
    setError(null);
    const res = await fetch(`/api/games/${game.code}/move`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ move: { cell } }),
    });
    if (res.ok) onMoved();
    else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Move failed");
    }
  };

  const winnerName = state.winner !== null ? game.players[state.winner]?.user.name : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {done
          ? state.winner !== null
            ? `${winnerName} wins!`
            : "It's a draw!"
          : myTurn
            ? "Your turn — tap a cell"
            : `${game.players[state.turn]?.user.name ?? "Opponent"} is thinking…`}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {state.board.map((cell, i) => (
          <button
            key={i}
            onClick={() => void click(i)}
            disabled={!myTurn || cell !== null}
            className={`flex h-24 w-24 items-center justify-center rounded-xl border text-4xl font-bold shadow-sm transition-all sm:h-28 sm:w-28 ${
              cell === "X"
                ? "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                : cell === "O"
                  ? "border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-900 dark:bg-pink-950 dark:text-pink-300"
                  : "border-zinc-200 bg-white hover:border-indigo-400 disabled:hover:border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:disabled:hover:border-zinc-700"
            } ${!myTurn || cell ? "" : "cursor-pointer"}`}
          >
            {cell}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}