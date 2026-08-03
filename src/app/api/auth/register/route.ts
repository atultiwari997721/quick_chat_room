import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password, name, avatar } = body as {
    username?: string;
    password?: string;
    name?: string;
    avatar?: string | null;
  };

  const uname = username?.trim() ?? "";
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(uname)) {
    return NextResponse.json(
      {
        error: "Username must be 3-20 characters (letters, numbers, . or _)",
      },
      { status: 400 }
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username: uname } });
  if (existing) {
    return NextResponse.json(
      { error: "That username is already taken" },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      username: uname,
      name: name.trim(),
      avatar: avatar || null,
      passwordHash: hashPassword(password),
    },
  });
  const token = await createSession(user.id);

  return NextResponse.json(
    { user: toPublicUser(user), token },
    { status: 201 }
  );
}