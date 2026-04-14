import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { generateSignedPutUrl } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin role required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { romPath, romContentType, artPath, artContentType } = body as {
      romPath: string;
      romContentType: string;
      artPath?: string | null;
      artContentType?: string;
    };

    if (!romPath || !romContentType) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "romPath and romContentType are required" } },
        { status: 400 }
      );
    }

    const romUploadUrl = await generateSignedPutUrl(romPath, romContentType);
    let artUploadUrl: string | null = null;

    if (artPath && artContentType) {
      artUploadUrl = await generateSignedPutUrl(artPath, artContentType);
    }

    return NextResponse.json({ romUploadUrl, artUploadUrl });
  } catch (err) {
    console.error("POST /api/admin/games/upload-urls error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate upload URLs" } },
      { status: 500 }
    );
  }
}
