import type { GameEngine, GameState } from "./engine";

export type UnoCard = {
  color: "red" | "yellow" | "green" | "blue" | "wild";
  value: number | "skip" | "reverse" | "plus2" | "wild" | "plus4";
};

export interface UnoState extends GameState {
  deck: UnoCard[];
  hands: UnoCard[][];
  discard: UnoCard;
  turn: number;
  direction: 1 | -1;
  drawPile: number;
  wildColor: "red" | "yellow" | "green" | "blue" | null;
  winner: number | null;
}

const COLORS = ["red", "yellow", "green", "blue"] as const;
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push({ color, value: 0 });
    for (let i = 0; i < 2; i++) {
      for (const value of NUMBERS.slice(1)) deck.push({ color, value });
      deck.push({ color, value: "skip" });
      deck.push({ color, value: "reverse" });
      deck.push({ color, value: "plus2" });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: "wild", value: "wild" });
    deck.push({ color: "wild", value: "plus4" });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function canPlay(card: UnoCard, top: UnoCard, wildColor: UnoCard["color"] | null): boolean {
  if (card.color === "wild") return true;
  const topColor = top.color === "wild" ? (wildColor ?? "red") : top.color;
  if (card.color === topColor) return true;
  if (card.value !== "wild" && card.value !== "plus4" && card.value === top.value && top.value !== "skip" && top.value !== "reverse" && top.value !== "plus2") return true;
  return false;
}

export const unoEngine: GameEngine = {
  id: "uno",
  name: "UNO",
  minPlayers: 2,
  maxPlayers: 4,
  createState: (players) => {
    const deck = buildDeck();
    const hands: UnoCard[][] = [];
    for (let i = 0; i < players; i++) hands.push(deck.splice(0, 7));
    let discard = deck.pop()!;
    while (discard.color === "wild") {
      deck.unshift(discard);
      discard = deck.pop()!;
    }
    return {
      deck,
      hands,
      discard,
      turn: 0,
      direction: 1,
      drawPile: 0,
      wildColor: null,
      winner: null,
    };
  },
  applyMove: (state, seat, move) => {
    const s = state as UnoState;
    if (s.winner !== null) return { ok: false, error: "Game over" };
    if (seat !== s.turn) return { ok: false, error: "Not your turn" };

    const m = move as { type?: string; card?: UnoCard; color?: UnoCard["color"] };

    if (m.type === "draw") {
      if (s.drawPile > 0) {
        const card = s.deck.pop()!;
        s.drawPile--;
        if (card) s.hands[seat].push(card);
      } else {
        const card = s.deck.pop();
        if (card) s.hands[seat].push(card);
      }
      s.turn = (seat + s.direction + s.hands.length) % s.hands.length;
      return { ok: true, state: s as unknown as GameState };
    }

    const card = m.card;
    if (!card || !s.hands[seat].some((c) => c.color === card.color && c.value === card.value)) {
      return { ok: false, error: "You don't have that card" };
    }
    if (!canPlay(card, s.discard, s.wildColor)) {
      return { ok: false, error: "Card cannot be played" };
    }

    s.hands[seat] = s.hands[seat].filter(
      (c) => !(c.color === card.color && c.value === card.value)
    );
    s.discard = card;
    const chosen = m.color;
    s.wildColor =
      card.color === "wild"
        ? chosen && chosen !== "wild"
          ? chosen
          : "red"
        : null;

    if (s.hands[seat].length === 0) {
      s.winner = seat;
      return { ok: true, state: s as unknown as GameState };
    }

    const delta = s.direction;

    if (card.value === "skip") {
      s.turn = (seat + 2 * delta + s.hands.length * 2) % s.hands.length;
      return { ok: true, state: s as unknown as GameState };
    }
    if (card.value === "reverse") {
      s.direction = (s.direction * -1) as 1 | -1;
      s.turn = (seat + s.direction + s.hands.length) % s.hands.length;
      return { ok: true, state: s as unknown as GameState };
    }
    if (card.value === "plus2") {
      const target = (seat + delta + s.hands.length) % s.hands.length;
      for (let i = 0; i < 2; i++) {
        const c = s.deck.pop();
        if (c) s.hands[target].push(c);
      }
      s.turn = (seat + 2 * delta + s.hands.length * 2) % s.hands.length;
      return { ok: true, state: s as unknown as GameState };
    }
    if (card.value === "plus4") {
      const target = (seat + delta + s.hands.length) % s.hands.length;
      for (let i = 0; i < 4; i++) {
        const c = s.deck.pop();
        if (c) s.hands[target].push(c);
      }
      s.turn = (seat + 2 * delta + s.hands.length * 2) % s.hands.length;
      return { ok: true, state: s as unknown as GameState };
    }

    s.turn = (seat + delta + s.hands.length) % s.hands.length;
    return { ok: true, state: s as unknown as GameState };
  },
  isFinished: (state) => (state as UnoState).winner !== null,
  winnerSeat: (state) => (state as UnoState).winner,
};