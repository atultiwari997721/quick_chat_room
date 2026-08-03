import type { GameEngine } from "./engine";
import { tictactoeEngine } from "./tictactoe";
import { chessEngine } from "./chess";
import { unoEngine } from "./uno";
import { ludoEngine } from "./ludo";

export const ENGINES: Record<string, GameEngine> = {
  tictactoe: tictactoeEngine,
  chess: chessEngine,
  uno: unoEngine,
  ludo: ludoEngine,
};

export function getEngine(type: string): GameEngine | null {
  return ENGINES[type] ?? null;
}
