export type Account = {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  createdAt: string;
};

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
  kind: string;
  adminId: string | null;
  createdAt: string;
  members: RoomUser[];
};

export type RoomSummary = {
  id: string;
  code: string;
  name: string;
  kind: string;
  adminId: string | null;
  createdAt: string;
  memberCount: number;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    author: string;
  } | null;
};

export type OtherUser = RoomUser & {
  username: string;
};

export type FollowEntry = {
  id: string;
  follower: OtherUser;
  followee: OtherUser;
  status: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  user: RoomUser;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};
