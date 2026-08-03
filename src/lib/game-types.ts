import type { RoomUser } from "./types";

export type GameData = {
  id: string;
  code: string;
  type: string;
  name: string;
  adminId: string | null;
  status: "lobby" | "playing" | "finished";
  state: unknown;
  winnerId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  players: {
    id: string;
    userId: string;
    seat: number;
    joinedAt: string;
    user: RoomUser;
  }[];
};