"use client";

import { useState } from "react";
import type { GameData } from "@/lib/game-types";

type UnoCard = {
  color: "red" | "yellow" | "green" | "blue" | "wild";
  value: number | "skip" | "reverse" | "plus2" | "wild" | "plus4";
};

type UnoState = {
  hands: UnoCard[][];
  discard: UnoCard;
  turn: number;
  direction: 1 | -1;
  drawPile: number;
  wildColor: UnoCard["color"] | null;
  winner: number | null;
};

const COLOR_STYLES: Record<string, string> = {
  red: "bg-red-500 text-white",
  yellow: "bg-yellow-400 text-zinc-900",
  green: "bg-green-500 text-white",
  blue: "bg-blue-500 text-white",
  wild: "bg-zinc-800 text-white",
};

const VAL_LABEL: Record<string, string> = {
  skip: "⊘",
  reverse: "⇄",
  plus2: "+2",
  wild: "W",
  plus4: "+4",
};

type UnoBoardProps = {
  game: GameData;
  mySeat: number | null;
  token: string;
  onMoved: () => void;
};

export function UnoBoard({ game, mySeat, token, onMoved }: UnoBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const [choosingColor, setChoosingColor] = useState<"wild" | "plus4" | null>(null);
  const [pendingCard, setPendingCard] = useState<UnoCard | null>(null);
  const state = game.state as UnoState;
  const myTurn = mySeat !== null && state.turn === mySeat && state.winner === null;

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
      setChoosingColor(null);
      setPendingCard(null);
      onMoved();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Move failed");
      setChoosingColor(null);
      setPendingCard(null);
    }
  };

  const playCard = (card: UnoCard) => {
    if (!myTurn) return;
    if (card.value === "wild" || card.value === "plus4") {
      setPendingCard(card);
      setChoosingColor(card.value);
      return;
    }
    void sendMove({ type: "play", card });
  };

  const winnerName = state.winner !== null ? game.players[state.winner]?.user.name : null;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        {state.winner !== null
          ? `${winnerName} wins!`
          : myTurn
            ? "Your turn — play a card or draw"
            : `${game.players[state.turn]?.user.name ?? "Opponent"} is thinking…`}
      </p>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-500">Draw pile</p>
          <div className="flex h-24 w-16 items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 text-sm font-bold text-zinc-400 dark:border-zinc-700">
            {state.hands[state.turn]?.length ?? "?"}
          </div>
        </div>
        <div className="text-center">
          <p className="mb-1 text-xs text-zinc-500">Discard</p>
          <div
            className={`flex h-28 w-20 items-center justify-center rounded-xl shadow-lg ${
              COLOR_STYLES[state.discard.color === "wild" ? (state.wildColor ?? "wild") : state.discard.color]
            }`}
          >
            <span className="text-3xl font-bold drop-shadow">
              {typeof state.discard.value === "number"
                ? state.discard.value
                : VAL_LABEL[state.discard.value] ?? "?"}
            </span>
          </div>
        </div>
      </div>

      {myTurn && (
        <button
          onClick={() => void sendMove({ type: "draw" })}
          className="rounded-full bg-zinc-200 px-5 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Draw a card
        </button>
      )}

      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Your hand ({state.hands[mySeat ?? -1]?.length ?? 0})
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {(state.hands[mySeat ?? -1] ?? []).map((card, i) => (
            <button
              key={i}
              onClick={() => playCard(card)}
              disabled={!myTurn}
              className={`flex h-24 w-16 flex-col items-center justify-center rounded-xl shadow transition-transform hover:-translate-y-1 ${
                COLOR_STYLES[card.color === "wild" ? (state.wildColor ?? card.color) : card.color]
              } ${myTurn ? "cursor-pointer" : "opacity-60"}`}
            >
              <span className="text-2xl font-bold">
                {typeof card.value === "number" ? card.value : VAL_LABEL[card.value] ?? "?"}
              </span>
              <span className="text-[9px] font-medium uppercase opacity-80">
                {card.color}
              </span>
            </button>
          ))}
        </div>
      </div>

      {choosingColor && pendingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold">
              Pick a color for {pendingCard.value === "plus4" ? "+4" : "Wild"}:
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(["red", "yellow", "green", "blue"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    void sendMove({
                      type: "play",
                      card: pendingCard,
                      color: c,
                    })
                  }
                  className={`h-14 rounded-xl ${COLOR_STYLES[c]} font-bold`}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setChoosingColor(null);
                setPendingCard(null);
              }}
              className="text-sm text-zinc-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}