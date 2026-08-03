import type { GameEngine, GameState } from "./engine";

export type Piece = { type: "p" | "r" | "n" | "b" | "q" | "k"; color: 0 | 1 };
export type Board = (Piece | null)[][];

export interface ChessState extends GameState {
  board: Board;
  turn: number;
  castling: Record<number, { k: boolean; q: boolean }>;
  enPassant: [number, number] | null;
  winner: number | null;
  check: boolean;
  stalemate: boolean;
}

const INIT: [string, number][] = [
  ["r", 0], ["n", 0], ["b", 0], ["q", 0], ["k", 0], ["b", 0], ["n", 0], ["r", 0],
];

function emptyBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: INIT[c][0] as Piece["type"], color: 1 };
    board[1][c] = { type: "p", color: 1 };
    board[6][c] = { type: "p", color: 0 };
    board[7][c] = { type: INIT[c][0] as Piece["type"], color: 0 };
  }
  return board;
}

const DIRS: Record<string, [number, number][]> = {
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  n: [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]],
};

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function findKing(board: Board, color: number): [number, number] | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === "k" && p.color === color) return [r, c];
    }
  return null;
}

function isAttacked(board: Board, r: number, c: number, by: number): boolean {
  for (let rr = 0; rr < 8; rr++)
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (!p || p.color !== by) continue;
      if (p.type === "p") {
        const dir = by === 0 ? -1 : 1;
        if (rr + dir === r && (cc + 1 === c || cc - 1 === c)) return true;
        continue;
      }
      if (p.type === "k") {
        if (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1) return true;
        continue;
      }
      const dirs = DIRS[p.type];
      if (!dirs) continue;
      for (const [dr, dc] of dirs) {
        let nr = rr + dr, nc = cc + dc;
        while (inBounds(nr, nc)) {
          if (nr === r && nc === c) return true;
          if (board[nr][nc]) break;
          nr += dr;
          nc += dc;
        }
      }
    }
  return false;
}

function isInCheck(board: Board, color: number): boolean {
  const k = findKing(board, color);
  return k ? isAttacked(board, k[0], k[1], color === 0 ? 1 : 0) : false;
}

export function pseudoMoves(board: Board, r: number, c: number, enPassant: [number, number] | null): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const out: [number, number][] = [];
  const { type, color } = piece;

  if (type === "p") {
    const dir = color === 0 ? -1 : 1;
    const startRow = color === 0 ? 6 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      out.push([r + dir, c]);
      if (r === startRow && !board[r + 2 * dir][c]) out.push([r + 2 * dir, c]);
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] && board[nr][nc]!.color !== color) out.push([nr, nc]);
      if (enPassant && enPassant[0] === nr && enPassant[1] === nc && !board[nr][nc]) out.push([nr, nc]);
    }
    return out;
  }

  if (type === "k") {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color !== color)) out.push([nr, nc]);
      }
    return out;
  }

  const dirs = DIRS[type];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (!board[nr][nc]) {
        out.push([nr, nc]);
      } else {
        if (board[nr][nc]!.color !== color) out.push([nr, nc]);
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return out;
}

export function legalMoves(
  board: Board,
  r: number,
  c: number,
  castling: Record<number, { k: boolean; q: boolean }>,
  enPassant: [number, number] | null
): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const raw = pseudoMoves(board, r, c, enPassant);
  const legal: [number, number][] = [];
  for (const [tr, tc] of raw) {
    const b = cloneBoard(board);
    b[tr][tc] = b[r][c];
    b[r][c] = null;
    if (b[tr][tc]!.type === "p" && enPassant && enPassant[0] === tr && enPassant[1] === tc) {
      b[r][tc] = null;
    }
    if (!isInCheck(b, piece.color)) legal.push([tr, tc]);
  }
  // Castling
  if (piece.type === "k" && !isInCheck(board, piece.color)) {
    const rights = castling[piece.color];
    const row = piece.color === 0 ? 7 : 0;
    if (rights.k && !board[row][5] && !board[row][6] && !isAttacked(board, row, 5, piece.color === 0 ? 1 : 0) && !isAttacked(board, row, 6, piece.color === 0 ? 1 : 0)) {
      legal.push([row, 6]);
    }
    if (rights.q && !board[row][3] && !board[row][2] && !board[row][1] && !isAttacked(board, row, 3, piece.color === 0 ? 1 : 0) && !isAttacked(board, row, 2, piece.color === 0 ? 1 : 0)) {
      legal.push([row, 2]);
    }
  }
  return legal;
}

function hasAnyLegalMove(s: ChessState, color: number): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      if (p && p.color === color && legalMoves(s.board, r, c, s.castling, s.enPassant).length > 0)
        return true;
    }
  return false;
}

export const chessEngine: GameEngine = {
  id: "chess",
  name: "Chess",
  minPlayers: 2,
  maxPlayers: 2,
  createState: () => ({
    board: emptyBoard(),
    turn: 0,
    castling: { 0: { k: true, q: true }, 1: { k: true, q: true } },
    enPassant: null,
    winner: null,
    check: false,
    stalemate: false,
  }),
  applyMove: (state, seat, move) => {
    const s = state as ChessState;
    const m = move as { from?: [number, number]; to?: [number, number]; promotion?: string };
    if (s.winner !== null || s.stalemate) return { ok: false, error: "Game over" };
    if (seat !== s.turn) return { ok: false, error: "Not your turn" };
    if (!m.from || !m.to) return { ok: false, error: "Invalid move" };
    const [fr, fc] = m.from;
    const [tr, tc] = m.to;
    const piece = s.board[fr]?.[fc];
    if (!piece || piece.color !== seat) return { ok: false, error: "No piece there" };
    const legal = legalMoves(s.board, fr, fc, s.castling, s.enPassant);
    const target = legal.find(([r, c]) => r === tr && c === tc);
    if (!target) return { ok: false, error: "Illegal move" };

    const castlingDone = piece.type === "k" && Math.abs(tc - fc) === 2;
    const enPassantCapture = piece.type === "p" && s.enPassant && s.enPassant[0] === tr && s.enPassant[1] === tc;
    const pawnPromote = piece.type === "p" && (tr === 0 || tr === 7);

    s.board[tr][tc] = pawnPromote ? { type: "q", color: seat } : piece;
    s.board[fr][fc] = null;
    if (enPassantCapture) s.board[fr][tc] = null;
    if (castlingDone) {
      const row = seat === 0 ? 7 : 0;
      if (tc === 6) {
        s.board[row][5] = s.board[row][7];
        s.board[row][7] = null;
      } else {
        s.board[row][3] = s.board[row][0];
        s.board[row][0] = null;
      }
    }

    if (piece.type === "k") s.castling[seat] = { k: false, q: false };
    if (piece.type === "r") {
      if (fc === 0) s.castling[seat].q = false;
      if (fc === 7) s.castling[seat].k = false;
    }

    s.enPassant =
      piece.type === "p" && Math.abs(tr - fr) === 2
        ? [fr + (tr > fr ? 1 : -1), fc]
        : null;

    const next = seat === 0 ? 1 : 0;
    s.turn = next;
    s.check = isInCheck(s.board, next);
    const moves = hasAnyLegalMove(s, next);
    if (!moves) {
      if (s.check) s.winner = seat;
      else s.stalemate = true;
    }
    return { ok: true, state: s as unknown as GameState };
  },
  isFinished: (state) => {
    const s = state as ChessState;
    return s.winner !== null || s.stalemate;
  },
  winnerSeat: (state) => (state as ChessState).winner,
};