import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { subscriptions } from "@/db/schema/payments";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";
    const subscriptionStatus = searchParams.get("subscriptionStatus") ?? "";
    const registeredAfter = searchParams.get("registeredAfter") ?? "";
    const registeredBefore = searchParams.get("registeredBefore") ?? "";

    const conditions = [];
    if (search) {
      conditions.push(
        sql`(${users.email} ILIKE ${"%" + search + "%"} OR ${users.username} ILIKE ${"%" + search + "%"})`
      );
    }
    if (role) {
      conditions.push(eq(users.role, role));
    }
    if (registeredAfter) {
      conditions.push(gte(users.createdAt, new Date(registeredAfter)));
    }
    if (registeredBefore) {
      conditions.push(lte(users.createdAt, new Date(registeredBefore)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // If filtering by subscription status, join with subscriptions
    let rows: Array<{
      id: string;
      email: string;
      username: string;
      role: string;
      subscriptionTier: string;
      isBanned: boolean;
      createdAt: Date;
      subscriptionStatus: string | null;
    }>;

    if (subscriptionStatus) {
      const subQuery = db
        .select({
          userId: subscriptions.userId,
          status: subscriptions.status,
        })
        .from(subscriptions)
        .where(eq(subscriptions.status, subscriptionStatus))
        .as("sub");

      rows = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          role: users.role,
          subscriptionTier: users.subscriptionTier,
          isBanned: users.isBanned,
          createdAt: users.createdAt,
          subscriptionStatus: subQuery.status,
        })
        .from(users)
        .innerJoin(subQuery, eq(users.id, subQuery.userId))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      const baseRows = await db
        .select({
          id: users.id,
          email: users.email,
          username: users.username,
          role: users.role,
          subscriptionTier: users.subscriptionTier,
          isBanned: users.isBanned,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      rows = baseRows.map((r) => ({ ...r, subscriptionStatus: null }));
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    return NextResponse.json({
      users: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch users" } },
      { status: 500 }
    );
  }
}
