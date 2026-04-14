import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { games } from "@/db/schema/games";
import { eq, and, ilike, asc, desc, or, SQL } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    const isAdmin = session?.user?.role === "admin";

    const { searchParams } = req.nextUrl;
    const system = searchParams.get("system");
    const genre = searchParams.get("genre");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") ?? "title";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    const conditions: SQL[] = [];

    // Non-admins only see active games (Req 13.6, 13.7)
    if (!isAdmin) {
      conditions.push(eq(games.isActive, true));
    }

    if (system) conditions.push(eq(games.system, system));
    if (genre) conditions.push(eq(games.genre, genre));
    if (search) {
      conditions.push(
        or(
          ilike(games.title, `%${search}%`),
          ilike(games.genre, `%${search}%`)
        ) as SQL
      );
    }

    const orderCol =
      sort === "releaseYear"
        ? desc(games.releaseYear)
        : sort === "totalPlays"
        ? desc(games.totalPlays)
        : asc(games.title);

    const rows = await db
      .select()
      .from(games)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderCol)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return NextResponse.json({ games: rows, page, pageSize: PAGE_SIZE });
  } catch (err) {
    console.error("GET /api/games error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch games" } },
      { status: 500 }
    );
  }
}
