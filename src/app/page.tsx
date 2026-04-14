import Link from "next/link";
import Image from "next/image";
import { getGames } from "@/db/queries/games";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Server Component — LCP element (hero heading) is server-rendered, no JS blocking
export default async function HomePage() {
  // Fetch top 6 games by total plays for the preview section
  let topGames: Awaited<ReturnType<typeof getGames>> = [];
  try {
    const all = await getGames({ isActive: true });
    topGames = all
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .slice(0, 6);
  } catch {
    // DB may not be available in dev without env vars — gracefully degrade
    topGames = [];
  }

  const features = [
    {
      icon: "🎮",
      title: "No Downloads",
      description: "Play NES, SNES, GBA, N64, PSP, and PS2 games directly in your browser using WebAssembly.",
    },
    {
      icon: "📱",
      title: "Phone as Controller",
      description: "Generate a session code and use your phone as a wireless gamepad — real couch gaming vibes.",
    },
    {
      icon: "👥",
      title: "Multiplayer Modes",
      description: "Up to 4 controllers per session. Play with friends locally or remotely.",
    },
    {
      icon: "💾",
      title: "Cloud Save States",
      description: "Save your progress to the cloud and pick up where you left off on any device.",
    },
  ];

  return (
    <main className="min-h-screen">
      {/* Hero — LCP element is the h1 heading, server-rendered */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* LCP element: server-rendered heading */}
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            Retro Gaming,{" "}
            <span className="text-primary">Reimagined</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Play classic games in your browser. Use your phone as a wireless
            controller. No installs, no downloads — just play.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="min-h-[44px] min-w-[44px]">
              <Link href="/games">Browse Games</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-[44px] min-w-[44px]"
            >
              <Link href="/auth">Get Started Free</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Free to play · No credit card required
          </p>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need for couch gaming
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl border bg-card space-y-3"
            >
              <span className="text-3xl" role="img" aria-label={f.title}>
                {f.icon}
              </span>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Game browser preview */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Popular Games</h2>
            <Button asChild variant="ghost" className="min-h-[44px]">
              <Link href="/games">View all →</Link>
            </Button>
          </div>

          {topGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {topGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.slug}`}
                  className="group block space-y-2"
                  prefetch={false}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {game.coverArtPath ? (
                      <Image
                        src={game.coverArtPath}
                        alt={game.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                        {game.system.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-xs line-clamp-2 group-hover:underline">
                      {game.title}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {game.system.toUpperCase()}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Games coming soon.</p>
              <Button asChild className="mt-4 min-h-[44px]">
                <Link href="/auth">Sign up to be notified</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Demo CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">Ready to play?</h2>
          <p className="text-muted-foreground">
            Jump in as a guest or create a free account to save your progress
            and access all features.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="min-h-[44px]">
              <Link href="/games">Play as Guest</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-[44px]"
            >
              <Link href="/auth">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
