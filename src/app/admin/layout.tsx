import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";

const navItems = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/sessions", label: "Sessions" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin guard — redirects to /auth if unauthenticated, /dashboard if not admin
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/admin" className="font-bold text-lg tracking-tight">
            CouchCode Admin
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Link
            href="/dashboard"
            className="flex items-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
