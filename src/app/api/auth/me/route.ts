import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "@/lib/auth";
import { toPublicUser } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(session.user) });
}