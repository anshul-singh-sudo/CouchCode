import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { signResetToken, verifyResetToken } from "@/lib/resetToken";

/**
 * POST /api/auth/reset-password
 * Request a password reset — generates a signed token and (in production) sends an email.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "email is required" } },
        { status: 400 }
      );
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return 200 to avoid user enumeration
    if (!user) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const token = await signResetToken(user.id, user.email);

    // In production, send the token via email.
    // For now, log it (replace with email service integration).
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Password reset token for ${user.email}: ${token}`);
    }

    // TODO: integrate email service (e.g. Resend, SendGrid) to send reset link
    // await sendResetEmail(user.email, token);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Reset password request error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process reset request" } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/reset-password
 * Confirm password reset — validates the token and updates the password hash.
 */
export async function PUT(req: NextRequest) {
  try {
    const { token, password } = (await req.json()) as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "token and password are required" } },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Password must be at least 8 characters" } },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = await verifyResetToken(token);
    } catch {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid or expired reset token" } },
        { status: 401 }
      );
    }

    const passwordHash = await hash(password, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, payload.sub));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Reset password confirm error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to reset password" } },
      { status: 500 }
    );
  }
}
