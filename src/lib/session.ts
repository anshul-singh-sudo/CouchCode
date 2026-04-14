import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

/**
 * Requires an authenticated session. Redirects to /auth if not authenticated.
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/auth");
  }
  return session;
}

/**
 * Requires an admin session. Redirects to /auth if not authenticated, returns 403 data if not admin.
 */
export async function requireAdmin() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/auth");
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}
