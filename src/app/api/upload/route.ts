import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 25 MB limit" },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const originalName = file.name || "attachment";
    const rawExt = path.extname(originalName).toLowerCase();
    const safeExt = rawExt && rawExt.length <= 10 && /^\.[a-z0-9]+$/.test(rawExt)
      ? rawExt
      : "";
    const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${safeExt}`;
    const destinationPath = path.join(uploadsDir, uniqueName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(destinationPath, buffer);

    const publicUrl = `/uploads/${uniqueName}`;

    return NextResponse.json(
      {
        url: publicUrl,
        fileName: originalName,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
