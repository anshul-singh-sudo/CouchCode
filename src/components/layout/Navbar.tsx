"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/games", label: "Games" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center justify-between max-w-7xl">
        {/* Logo */}
        <Link
          href="/"
          className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        >
          CouchCode
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname.startsWith(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="min-h-[44px] min-w-[44px]">
            <Link href="/auth">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="min-h-[44px] min-w-[44px]">
            <Link href="/auth">Get Started</Link>
          </Button>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden flex items-center justify-center w-11 h-11 rounded-md hover:bg-accent transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            // X icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            // Hamburger icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          id="mobile-menu"
          className="md:hidden border-t bg-background px-4 py-4 space-y-3"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-3 rounded-md text-sm font-medium transition-colors hover:bg-accent min-h-[44px] flex items-center ${
                  pathname.startsWith(link.href)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground"
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button
              asChild
              variant="outline"
              className="w-full min-h-[44px]"
            >
              <Link href="/auth" onClick={() => setOpen(false)}>
                Sign In
              </Link>
            </Button>
            <Button asChild className="w-full min-h-[44px]">
              <Link href="/auth" onClick={() => setOpen(false)}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
