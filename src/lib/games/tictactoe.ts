import type { GameEngine, GameState } from "./engine";

export interface TicTacToeState extends GameState {
  board: (string | null)[];
  turn: number;
  winner: number | null;
  draw: boolean;
}

function checkWin(board: (string | null)[]): number | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] === "X" ? 0 : 1;
    }
  }
  return null;
}

export const tictactoeEngine: GameEngine = {
  id: "tictactoe",
  name: "Tic Tac Toe",
  minPlayers: 2,
  maxPlayers: 2,
  createState: () => ({
    board: Array(9).fill(null),
    turn: 0,
    winner: null,
    draw: false,
  }),
  applyMove: (state, seat, move) => {
    const s = state as TicTacToeState;
    const cell = (move as { cell?: number }).cell;
    if (s.winner !== null || s.draw) return { ok: false, error: "Game over" };
    if (typeof cell !== "number" || cell < 0 || cell > 8)
      return { ok: false, error: "Invalid cell" };
    if (s.board[cell] !== null) return { ok: false, error: "Cell taken" };
    if (seat !== s.turn) return { ok: false, error: "Not your turn" };
    s.board[cell] = seat === 0 ? "X" : "O";
    const winner = checkWin(s.board);
    s.winner = winner;
    s.draw = winner === null && s.board.every((c) => c !== null);
    if (!s.winner && !s.draw) s.turn = s.turn === 0 ? 1 : 0;
    return { ok: true, state: s as unknown as GameState };
  },
  isFinished: (state) => (state as TicTacToeState).winner !== null || (state as TicTacToeState).draw,
  winnerSeat: (state) => (state as TicTacToeState).winner,
};