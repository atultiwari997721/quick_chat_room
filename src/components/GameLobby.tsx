"use client";

import { useState } from "react";
import { GAME_META } from "@/lib/games/engine";
import type { GameId } from "@/lib/games/engine";
import type { GameData } from "@/lib/game-types";

type GameLobbyProps = {
  game: GameData;
  isAdmin: boolean;
  token: string;
  onExit: () => void;
  onStart: () => void;
};

export function GameLobby({ game, isAdmin, token, onExit, onStart }: GameLobbyProps) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = GAME_META[game.type as GameId];

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/?game=${game.code}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const start = async () => {
    setBusy(true);
    const res = await fetch(`/api/games/${game.code}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) onStart();
    setBusy(false);
  };

  const max = meta?.players ?? "4";

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={onExit}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{game.name}</h1>
          <p className="text-xs text-zinc-500">
            {meta?.name} · waiting for players
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-3xl font-bold text-white shadow-lg">
          {meta?.name.charAt(0) ?? "#"}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{game.name}</h2>
          <p className="text-sm text-zinc-500">
            {game.players.length}/{max} players joined
          </p>
        </div>

        <button
          onClick={() => void copyCode()}
          className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 font-mono text-xl tracking-[0.3em] shadow-sm transition-colors hover:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-400"
        >
          {game.code}
          <span className="text-xs font-sans font-medium text-zinc-500">
            {copied ? "Copied!" : "Copy invite"}
          </span>
        </button>

        <ul className="flex flex-wrap justify-center gap-2">
          {game.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pl-1.5 pr-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-xs font-bold text-white">
                {p.user.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium">{p.user.name}</span>
              {p.userId === game.adminId && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Admin
                </span>
              )}
            </li>
          ))}
        </ul>

        {isAdmin ? (
          <button
            onClick={() => void start()}
            disabled={busy}
            className="mt-2 rounded-full bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-8 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Starting…" : "Start Game"}
          </button>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Waiting for the admin to start the game…
          </p>
        )}
      </div>
    </main>
  );
}