"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_META, GAME_IDS } from "@/lib/games/engine";
import type { GameId } from "@/lib/games/engine";
import type { GameData } from "@/lib/game-types";
import { GameLobby } from "@/components/GameLobby";
import { TicTacToeBoard } from "@/components/games/TicTacToeBoard";
import { ChessBoard } from "@/components/games/ChessBoard";
import { UnoBoard } from "@/components/games/UnoBoard";
import { LudoBoard } from "@/components/games/LudoBoard";

type GamesPanelProps = {
  account: { id: string };
  token: string;
  onLogout: () => void;
  onBack: () => void;
  initialCode?: string | null;
};

export function GamesPanel({ account, token, onBack, initialCode }: GamesPanelProps) {
  const [games, setGames] = useState<GameData[]>([]);
  const [active, setActive] = useState<GameData | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [joinCode, setJoinCode] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<GameId>("tictactoe");
  const [createName, setCreateName] = useState("");
  const autoJoined = useRef(false);

  const loadGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setGames(data.games);
      }
    } catch {
      // ignore
    }
  }, [token]);

  const loadGame = useCallback(
    async (code: string, silent = false) => {
      try {
        const res = await fetch(`/api/games/${code}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.game.status === "finished") {
            const list = await fetch("/api/games", {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (list.ok) setGames((await list.json()).games);
          }
          setActive(data.game);
          setError(null);
        } else if (!silent) {
          setError("Game not found");
        }
      } catch {
        // ignore
      }
    },
    [token]
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void loadGames();
    /* eslint-enable react-hooks/set-state-in-effect */
    const interval = setInterval(() => {
      void loadGames();
      setActive((cur) => {
        if (cur) void loadGame(cur.code, true);
        return cur;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [loadGames, loadGame]);

  const createGame = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedType,
          name: createName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create game");
        return;
      }
      setShowNew(false);
      setCreateName("");
      await loadGame(data.game.code);
      void loadGames();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  const joinGame = async (code?: string) => {
    const target = (code ?? joinCode).trim();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/games/join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join game");
        return;
      }
      setJoinCode("");
      await loadGame(data.game.code);
      void loadGames();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialCode && !autoJoined.current) {
      autoJoined.current = true;
      setError("Joining " + initialCode + "…");
      void joinGame(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  if (active) {
    const me = active.players.find((p) => p.userId === account.id);
    return (
      <GameView
        game={active}
        mySeat={me?.seat ?? null}
        isAdmin={active.adminId === account.id}
        token={token}
        onExit={() => {
          setActive(null);
          void loadGames();
        }}
        onRefresh={() => void loadGame(active.code, true)}
      />
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={onBack}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold">Games</h1>
          <p className="text-xs text-zinc-500">
            Play Tic Tac Toe, Chess, UNO and Ludo with friends
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded-full bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow"
        >
          New Game
        </button>
      </header>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {showNew && (
        <div className="flex flex-wrap items-end gap-3 border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Game
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as GameId)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {GAME_IDS.map((id) => (
                <option key={id} value={id}>
                  {GAME_META[id].name} ({GAME_META[id].players} players)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Room name (optional)
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="My Game"
              maxLength={40}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </label>
          <button
            onClick={() => void createGame()}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create"}
          </button>
          <div className="mx-2 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Join by code
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm tracking-widest text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <button
                onClick={() => void joinGame()}
                disabled={busy || joinCode.length !== 6}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Join
              </button>
            </div>
          </label>
        </div>
      )}

      <ul className="flex-1 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
        {games.length === 0 && (
          <li className="px-4 py-14 text-center text-sm text-zinc-400">
            No games yet. Create one and share the code!
          </li>
        )}
        {games.map((g) => (
          <li key={g.id}>
            <button
              onClick={() => void loadGame(g.code)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-pink-500 to-amber-400 text-sm font-bold text-white shadow">
                {GAME_META[g.type as GameId]?.name.charAt(0) ?? g.type.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium">{g.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      g.status === "lobby"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : g.status === "playing"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    }`}
                  >
                    {g.status}
                  </span>
                </div>
                <p className="truncate text-xs text-zinc-500">
                  {GAME_META[g.type as GameId]?.name ?? g.type} ·{" "}
                  {g.players.length} player{g.players.length === 1 ? "" : "s"} · #
                  {g.code}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function GameView({
  game,
  mySeat,
  isAdmin,
  token,
  onExit,
  onRefresh,
}: {
  game: GameData;
  mySeat: number | null;
  isAdmin: boolean;
  token: string;
  onExit: () => void;
  onRefresh: () => void;
}) {
  if (game.status === "lobby") {
    return (
      <GameLobby
        game={game}
        isAdmin={isAdmin}
        token={token}
        onExit={onExit}
        onStart={() => {
          void fetch(`/api/games/${game.code}/start`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).then(() => onRefresh());
        }}
      />
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => {
            void fetch(`/api/games/${game.code}/leave`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
            onExit();
          }}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Leave
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">{game.name}</h1>
          <p className="text-xs text-zinc-500">
            {GAME_META[game.type as GameId]?.name} · #{game.code}
          </p>
        </div>
        {game.status === "finished" && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Finished
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {game.type === "tictactoe" && (
          <TicTacToeBoard game={game} mySeat={mySeat} token={token} onMoved={onRefresh} />
        )}
        {game.type === "chess" && (
          <ChessBoard game={game} mySeat={mySeat} token={token} onMoved={onRefresh} />
        )}
        {game.type === "uno" && (
          <UnoBoard game={game} mySeat={mySeat} token={token} onMoved={onRefresh} />
        )}
        {game.type === "ludo" && (
          <LudoBoard game={game} mySeat={mySeat} token={token} onMoved={onRefresh} />
        )}
      </div>
    </main>
  );
}