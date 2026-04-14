"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSessionStore } from "@/stores/sessionStore";

interface SessionInfo {
  session: {
    id: string;
    code: string;
    gameId: string;
    status: string;
  };
  devices: Array<{
    id: string;
    role: string;
    playerSlot: number | null;
  }>;
}

interface GameInfo {
  id: string;
  title: string;
  slug: string;
  system: string;
  coverArtPath: string | null;
}

export default function JoinSessionPage() {
  const params = useParams<{ sessionCode: string }>();
  const router = useRouter();
  const { joinSession } = useSessionStore();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = params.sessionCode?.toUpperCase();

  useEffect(() => {
    if (!code) return;

    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${code}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error?.message ?? "Session not found");
          return;
        }
        const data: SessionInfo = await res.json();
        setSessionInfo(data);

        // Fetch game info
        const gameRes = await fetch(`/api/games?id=${data.session.gameId}`);
        if (gameRes.ok) {
          const games = await gameRes.json();
          if (games.games?.[0]) {
            setGameInfo(games.games[0] as GameInfo);
          }
        }
      } catch {
        setError("Failed to load session info");
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [code]);

  async function handleRoleSelect(role: "display" | "controller") {
    if (!code) return;
    setJoining(true);
    setError(null);

    try {
      await joinSession(code);

      if (role === "display" && gameInfo?.slug) {
        router.push(`/play/${gameInfo.slug}`);
      } else {
        router.push("/controller");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join session");
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Session Unavailable</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push("/games")}>Browse Games</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-1">Joining session</p>
          <h1 className="text-4xl font-mono font-bold tracking-widest">{code}</h1>
          {gameInfo && (
            <p className="mt-3 text-lg font-medium">{gameInfo.title}</p>
          )}
          {sessionInfo && (
            <p className="text-sm text-muted-foreground mt-1">
              {sessionInfo.devices.length} device{sessionInfo.devices.length !== 1 ? "s" : ""} connected
            </p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-center mb-4">Choose your role</p>

          <Button
            className="w-full h-16 text-lg"
            onClick={() => handleRoleSelect("display")}
            disabled={joining}
          >
            📺 Display
            <span className="block text-xs font-normal opacity-70 mt-0.5">
              Show the game on this screen
            </span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-16 text-lg"
            onClick={() => handleRoleSelect("controller")}
            disabled={joining}
          >
            🎮 Controller
            <span className="block text-xs font-normal opacity-70 mt-0.5">
              Use this device as a gamepad
            </span>
          </Button>
        </div>

        {joining && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Connecting...
          </p>
        )}
      </Card>
    </div>
  );
}
