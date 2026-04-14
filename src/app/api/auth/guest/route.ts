import { NextResponse } from "next/server";
import { signGuestToken } from "@/lib/guestToken";

export async function POST() {
  try {
    const { token, exp } = await signGuestToken();

    const response = NextResponse.json({ success: true, exp }, { status: 200 });

    response.cookies.set("guest-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Guest token error:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create guest session" } },
      { status: 500 }
    );
  }
}
