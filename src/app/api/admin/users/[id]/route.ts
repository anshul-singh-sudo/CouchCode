import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export async function GET(
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
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin role required" } },
        { status: 403 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("GET /api/admin/users/[id] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch user" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
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
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Admin role required" } },
        { status: 403 }
      );
    }

    const body = await req.json() as { isBanned?: boolean; role?: string };
    const updateData: Partial<typeof users.$inferInsert> = {};

    if (body.isBanned !== undefined) updateData.isBanned = body.isBanned;
    if (body.role !== undefined) updateData.role = body.role;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "No valid fields to update" } },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: { code: "USER_NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("PATCH /api/admin/users/[id] error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update user" } },
      { status: 500 }
    );
  }
}
