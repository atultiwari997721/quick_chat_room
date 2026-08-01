import { NextRequest, NextResponse } from "next/server";
import { deleteUserData } from "@/lib/cleanup";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteUserData(id);
  return NextResponse.json({ ok: true });
}
