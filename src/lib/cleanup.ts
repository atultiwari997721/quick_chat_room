import { prisma } from "@/lib/prisma";

export async function deleteUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { room: true },
  });
  if (!user) return;

  const wasAdmin = user.room && user.room.adminId === userId;

  await prisma.user.delete({ where: { id: userId } });

  if (wasAdmin && user.room) {
    const remaining = await prisma.room.findUnique({
      where: { id: user.room.id },
      include: { users: { orderBy: { createdAt: "asc" }, take: 1 } },
    });
    if (remaining && remaining.users.length > 0) {
      await prisma.room.update({
        where: { id: remaining.id },
        data: { adminId: remaining.users[0].id },
      });
    } else if (remaining) {
      await prisma.room.delete({ where: { id: remaining.id } });
    }
  }
}
