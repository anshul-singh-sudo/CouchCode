import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, username } = body as {
      email?: string;
      password?: string;
      username?: string;
    };

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "email, password, and username are required" } },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid email format" } },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: passwordError } },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Username must be 3–50 characters" } },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Email already registered" } },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        username,
        passwordHash,
      })
      .returning({ id: users.id, email: users.email, username: users.username });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint violation (username taken)
    if (
      err instanceof Error &&
      err.message.includes("unique") &&
      err.message.includes("username")
    ) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Username already taken" } },
        { status: 409 }
      );
    }
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
