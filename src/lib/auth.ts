import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/password";

export function getToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const query = request.nextUrl.searchParams.get("token");
  return query || null;
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  await prisma.session.create({ data: { token, userId } });
  return token;
}

export async function getSessionUser(token: string | null) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  return session?.user ?? null;
}

export async function requireUser(request: NextRequest) {
  const token = getToken(request);
  return getSessionUser(token);
}