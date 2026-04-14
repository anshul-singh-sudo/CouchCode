import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { games } from "@/db/schema/games";
import { ilike, sql, desc } from "drizzle-orm";

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

    const whereClause = search
      ? ilike(games.title, `%${search}%`)
      : undefined;

    const rows = await db
      .select()
      .from(games)
      .where(whereClause)
      .orderBy(desc(games.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(games)
      .where(whereClause);

    return NextResponse.json({
      games: rows,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error("GET /api/admin/games error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch games" } },
      { status: 500 }
    );
  }
}

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
    const {
      title,
      slug,
      system,
      genre,
      description,
      releaseYear,
      playerCount,
      isPremium,
      price,
      romPath,
      coverArtPath,
    } = body as {
      title?: string;
      slug?: string;
      system?: string;
      genre?: string;
      description?: string | null;
      releaseYear?: number | null;
      playerCount?: number;
      isPremium?: boolean;
      price?: number | null;
      romPath?: string;
      coverArtPath?: string | null;
    };

    if (!title || !slug || !system || !genre || !romPath) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "title, slug, system, genre, and romPath are required" } },
        { status: 400 }
      );
    }

    const [game] = await db
      .insert(games)
      .values({
        title,
        slug,
        system,
        genre,
        description: description ?? null,
        releaseYear: releaseYear ?? null,
        playerCount: playerCount ?? 1,
        isPremium: isPremium ?? false,
        price: price ?? null,
        romPath,
        coverArtPath: coverArtPath ?? null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ game }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "A game with this slug already exists" } },
        { status: 409 }
      );
    }
    console.error("POST /api/admin/games error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create game" } },
      { status: 500 }
    );
  }
}
