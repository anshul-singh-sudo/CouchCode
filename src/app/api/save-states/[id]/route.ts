import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { saveStates } from "@/db/schema/saves";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = params;

    // Only allow deleting own save states
    const [deleted] = await db
      .delete(saveStates)
      .where(and(eq(saveStates.id, id), eq(saveStates.userId, session.user.id)))
      .returning({ id: saveStates.id });

    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Save state not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/save-states/[id] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete save state" } },
      { status: 500 }
    );
  }
}
