export type RoomUser = {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: string;
};

export type Room = {
  id: string;
  code: string;
  name: string;
  adminId: string | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  user: RoomUser;
};
