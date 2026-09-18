import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  dbMigrated?: boolean;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let migrationPromise: Promise<void> | null = null;

export async function ensureDbSchema(): Promise<void> {
  if (globalForPrisma.dbMigrated) return;
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        await prisma.$executeRawUnsafe(`
          DO $$
          BEGIN
            -- Ensure Room table has 'kind' column
            BEGIN
              ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "kind" TEXT DEFAULT 'group';
            EXCEPTION WHEN OTHERS THEN NULL;
            END;

            -- Ensure Message table has attachment columns
            BEGIN
              ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
              ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
              ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileType" TEXT;
              ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;

            -- Ensure Follow table exists
            BEGIN
              CREATE TABLE IF NOT EXISTS "Follow" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "followerId" TEXT NOT NULL,
                "followeeId" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'pending',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
              CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followeeId_key" ON "Follow"("followerId", "followeeId");
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
          END $$;
        `);
        globalForPrisma.dbMigrated = true;
      } catch (err) {
        console.error("Auto-migration notice (handled):", err);
      }
    })();
  }
  return migrationPromise;
}
