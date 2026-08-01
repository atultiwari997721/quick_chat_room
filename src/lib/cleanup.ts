import { prisma } from "@/lib/prisma";

export async function deleteUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { room: true },
  });
  if (!user) return;

  const room = user.room;

  if (room && room.adminId === userId) {
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { roomId: room.id } }),
      prisma.room.delete({ where: { id: room.id } }),
    ]);
    return;
  }

  await prisma.user.delete({ where: { id: userId } });
}
