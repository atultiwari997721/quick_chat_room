import type { GameEngine, GameState } from "./engine";

export interface LudoState extends GameState {
  tokens: number[][]; // per player, 4 tokens: -1 yard, 0..50 main track, 51..56 home column, 57 finished
  turn: number;
  dice: number | null;
  extraRoll: boolean;
  moved: boolean;
  winner: number | null;
}

const TRACK = 51;
const HOME_END = 57;
// absolute safe cells on the 52-cell loop shared by all players
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function entry(seat: number): number {
  return seat * 13;
}

function absCell(seat: number, pos: number): number {
  return (entry(seat) + pos) % 52;
}

export const ludoEngine: GameEngine = {
  id: "ludo",
  name: "Ludo",
  minPlayers: 2,
  maxPlayers: 4,
  createState: (players) => ({
    tokens: Array.from({ length: players }, () => [-1, -1, -1, -1]),
    turn: 0,
    dice: null,
    lastMoved: false,
    winner: null,
  }),
  applyMove: (state, seat, move) => {
    const s = state as LudoState;
    const m = move as { roll?: boolean; token?: number };

    if (s.winner !== null) return { ok: false, error: "Game over" };
    if (seat !== s.turn) return { ok: false, error: "Not your turn" };

    // Roll the dice
    if (m.roll) {
      if (s.dice !== null) return { ok: false, error: "Already rolled" };
      s.dice = 1 + Math.floor(Math.random() * 6);
      s.moved = false;
      // If a 6 lets a token leave the yard or the player has no usable moves, allow pass handled on move step
      return { ok: true, state: s as unknown as GameState };
    }

    if (s.dice === null) return { ok: false, error: "Roll the dice first" };

    const tokenIdx = m.token;
    if (typeof tokenIdx !== "number" || tokenIdx < 0 || tokenIdx > 3)
      return { ok: false, error: "Invalid token" };
    const t = s.tokens[seat][tokenIdx];
    const d = s.dice!;

    // Token in yard: only a 6 brings it out
    if (t === -1) {
      if (d !== 6) return { ok: false, error: "Roll a 6 to bring a token out" };
      s.tokens[seat][tokenIdx] = 0;
      s.moved = true;
    } else if (t >= 51) {
      // Home column: move toward 57, need exact
      if (t + d > HOME_END) return { ok: false, error: "Need exact roll" };
      s.tokens[seat][tokenIdx] = t + d;
      s.moved = true;
    } else {
      const next = t + d;
      if (next > TRACK) {
        // crossing into home column — overshoot if beyond 56...
        if (next > 56) return { ok: false, error: "Overshot home" };
        s.tokens[seat][tokenIdx] = next;
        s.moved = true;
      } else {
        // landing on main track — capture check
        const absNext = absCell(seat, next);
        const isSafe = SAFE.has(absNext);
        s.tokens[seat][tokenIdx] = next;
        // capture opponents
        if (!isSafe) {
          for (let op = 0; op < s.tokens.length; op++) {
            if (op === seat) continue;
            for (let k = 0; k < 4; k++) {
              const opAbs = s.tokens[op][k];
              if (opAbs >= 0 && opAbs <= TRACK && absCell(op, opAbs) === absNext) {
                s.tokens[op][k] = -1;
              }
            }
          }
        }
        s.moved = true;
      }
    }

    if (s.tokens[seat].every((v) => v === HOME_END)) {
      s.winner = seat;
      return { ok: true, state: s as unknown as GameState };
    }

    // Extra turn on 6 if this seat can still make a move; otherwise pass
    const playable = (diceVal: number) =>
      s.tokens[seat].some((p) =>
        p === -1
          ? diceVal === 6
          : p >= 51
            ? p + diceVal <= HOME_END
            : (p + diceVal <= TRACK || p + diceVal <= 56)
      );

    if (d === 6 && playable(6)) {
      s.turn = seat;
      s.dice = null;
      return { ok: true, state: s as unknown as GameState };
    }

    s.dice = null;
    let next = (seat + 1) % s.tokens.length;
    while (s.tokens[next].every((v) => v === HOME_END)) {
      next = (next + 1) % s.tokens.length;
      if (next === seat) {
        s.winner = seat;
        return { ok: true, state: s as unknown as GameState };
      }
    }
    s.turn = next;
    return { ok: true, state: s as unknown as GameState };
  },
  isFinished: (state) => (state as LudoState).winner !== null,
  winnerSeat: (state) => {
    const s = state as LudoState;
    return s.winner;
  },
};