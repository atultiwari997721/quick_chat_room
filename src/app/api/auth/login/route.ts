import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body as { username?: string; password?: string };

  const uname = username?.trim() ?? "";
  if (!uname || !password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { username: uname } });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const token = await createSession(user.id);
  return NextResponse.json({ user: toPublicUser(user), token });
}