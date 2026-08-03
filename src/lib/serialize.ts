export function toPublicUser(user: {
  id: string;
  username: string | null;
  name: string;
  avatar: string | null;
  createdAt: Date;
}): {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  createdAt: string;
} {
  return {
    id: user.id,
    username: user.username ?? "",
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt.toISOString(),
  };
}