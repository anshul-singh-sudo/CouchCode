import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes require admin role
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      if (token?.role !== "admin") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Admin access required" } },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL("/auth", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const pathname = req.nextUrl.pathname;
        // These routes require authentication
        const protectedPaths = ["/dashboard", "/play", "/admin"];
        const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
        if (!isProtected) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/auth",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/play/:path*", "/admin/:path*", "/api/admin/:path*"],
};
