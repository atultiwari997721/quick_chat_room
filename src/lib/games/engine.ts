export type GameState = Record<string, unknown>;

export interface GameEngine {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  createState: (players: number) => GameState;
  applyMove: (state: GameState, seat: number, move: unknown) => { ok: true; state: GameState } | { ok: false; error: string };
  isFinished: (state: GameState) => boolean;
  winnerSeat: (state: GameState) => number | null;
}

export const GAME_IDS = ["tictactoe", "chess", "uno", "ludo"] as const;
export type GameId = (typeof GAME_IDS)[number];

export const GAME_META: Record<GameId, { name: string; players: string; desc: string }> = {
  tictactoe: { name: "Tic Tac Toe", players: "2", desc: "Classic 3x3 grid" },
  chess: { name: "Chess", players: "2", desc: "Full classic chess" },
  uno: { name: "UNO", players: "2-4", desc: "Cards, colors, +2, +4" },
  ludo: { name: "Ludo", players: "2-4", desc: "Dice and tokens" },
};
