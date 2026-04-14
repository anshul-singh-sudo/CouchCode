import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getSaveStates } from "@/db/queries/saves";
import { generateSignedGetUrl } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { gameId } = params;
    const slotParam = req.nextUrl.searchParams.get("slot");

    const states = await getSaveStates(session.user.id, gameId);

    // If a specific slot is requested, return a signed URL for that state
    if (slotParam !== null) {
      const slot = parseInt(slotParam, 10);
      const state = states.find((s) => s.slotNumber === slot);
      if (!state) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Save state not found" } },
          { status: 404 }
        );
      }
      const stateUrl = await generateSignedGetUrl(state.stateDataPath);
      const thumbnailUrl = state.thumbnailPath
        ? await generateSignedGetUrl(state.thumbnailPath)
        : null;
      return NextResponse.json({ stateUrl, thumbnailUrl, state });
    }

    // Return all save states with signed thumbnail URLs
    const statesWithUrls = await Promise.all(
      states.map(async (s) => ({
        ...s,
        thumbnailUrl: s.thumbnailPath
          ? await generateSignedGetUrl(s.thumbnailPath)
          : null,
      }))
    );

    return NextResponse.json({ saveStates: statesWithUrls });
  } catch (err) {
    console.error("GET /api/save-states/[gameId] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch save states" } },
      { status: 500 }
    );
  }
}
