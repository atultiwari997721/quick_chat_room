import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}