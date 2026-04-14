"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import SaveStateControls from "@/components/emulator/SaveStateControls";
import ModeSelector from "@/components/emulator/ModeSelector";
import SessionOverlay from "@/components/emulator/SessionOverlay";
import { useEmulatorStore } from "@/stores/emulatorStore";
import { useSessionStore } from "@/stores/sessionStore";
import { deserializeInputEvent, validateInputEvent } from "@/lib/inputEvent";
import type { System } from "@/stores/emulatorStore";

// Load EmulatorCanvas client-only (no SSR) — required for canvas + Web Worker APIs
const EmulatorCanvas = dynamic(
  () => import("@/components/emulator/EmulatorCanvas"),
  { ssr: false }
);

interface GameData {
  id: string;
  title: string;
  slug: string;
  system: System;
  isPremium: boolean;
}

export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const gameSlug = params.gameSlug as string;

  const [game, setGame] = useState<GameData | null>(null);
  const [mode, setMode] = useState<1 | 2 | 3 | 4>(1);
  const [playHistoryId, setPlayHistoryId] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const emulatorStatus = useEmulatorStore((s) => s.status);
  const fps = useEmulatorStore((s) => s.fps);

  // Session store for Mode 3/4
  const sessionCode = useSessionStore((s) => s.sessionCode);
  const connectedDevices = useSessionStore((s) => s.connectedDevices);
  const createSession = useSessionStore((s) => s.createSession);
  const disconnectSession = useSessionStore((s) => s.disconnect);

  const isPro = session?.user?.subscriptionTier === "pro";
  const maxSaveSlots = isPro ? 10 : 1;

  // Fetch game data and ROM URL, then start emulation
  useEffect(() => {
    if (authStatus === "loading") return;

    async function initGame() {
      try {
        // Fetch game metadata
        const gameRes = await fetch(`/api/games/${gameSlug}`);
        if (!gameRes.ok) {
          router.push("/games");
          return;
        }
        const { game: gameData } = await gameRes.json();
        setGame(gameData);

        // Gate premium games for unauthenticated / free-tier guests (Req 9.7)
        if (gameData.isPremium && !session?.user) {
          router.push("/auth");
          return;
        }

        // Fetch signed ROM URL
        const romRes = await fetch(`/api/games/${gameSlug}/rom-url`);
        if (!romRes.ok) {
          if (romRes.status === 403) {
            router.push("/auth");
            return;
          }
          throw new Error("Failed to get ROM URL");
        }
        const { url } = await romRes.json();

        // Start play history tracking (Req 28.1)
        const histRes = await fetch("/api/play-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: gameData.id }),
        });
        if (histRes.ok) {
          const { id } = await histRes.json();
          setPlayHistoryId(id);
          startTimeRef.current = Date.now();
        }

        // Load ROM into emulator
        await useEmulatorStore.getState().loadROM(url, gameData.system, {
          id: gameData.id,
          title: gameData.title,
          slug: gameData.slug,
          system: gameData.system,
        });
      } catch (err) {
        console.error("[PlayPage] init error:", err);
      }
    }

    initGame();
  }, [gameSlug, authStatus, session, router]);

  // Record play duration on unmount (Req 28.2)
  useEffect(() => {
    return () => {
      if (playHistoryId) {
        const durationSeconds = Math.round(
          (Date.now() - startTimeRef.current) / 1000
        );
        fetch(`/api/play-history/${playHistoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationSeconds }),
          keepalive: true,
        }).catch(console.error);
      }
    };
  }, [playHistoryId]);

  // Mode 3/4: create session when mode changes to 3 or 4 (Req 11.1, 12.1)
  useEffect(() => {
    if ((mode === 3 || mode === 4) && !sessionCode && game?.id) {
      createSession(game.id, mode).catch(console.error);
    }
    // Disconnect if switching back to mode 1 or 2
    if ((mode === 1 || mode === 2) && sessionCode) {
      disconnectSession();
    }
  }, [mode, game?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mode 3/4: listen for incoming input events from controller devices (Req 11.4, 12.5)
  useEffect(() => {
    if (mode !== 3 && mode !== 4) return;

    function handleRemoteInput(e: Event) {
      const bytes = (e as CustomEvent<Uint8Array>).detail;
      if (!validateInputEvent(bytes)) return;
      const event = deserializeInputEvent(bytes);
      // Route to emulator with correct player slot
      const emulator = useEmulatorStore.getState().emulatorInstance;
      if (emulator) {
        emulator.sendInput(event.playerId as 1 | 2 | 3 | 4, event.buttonId, event.state === 1);
      }
    }

    window.addEventListener("couchcode:input", handleRemoteInput);
    return () => window.removeEventListener("couchcode:input", handleRemoteInput);
  }, [mode]);

  // Keyboard input handlers — Mode 2 routes P1/P2 based on key set (Req 10.3, 10.4, 10.5)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (mode === 2) {
        // Try P2 keys first (numpad), then P1 keys
        const store = useEmulatorStore.getState();
        // Attempt P2 mapping
        store.sendInput(e, 2);
        // Also attempt P1 mapping (sendInput ignores unmapped keys)
        store.sendInput(e, 1);
      } else {
        useEmulatorStore.getState().sendInput(e, 1);
      }
    },
    [mode]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (mode === 2) {
        const store = useEmulatorStore.getState();
        store.sendInput(e, 2);
        store.sendInput(e, 1);
      } else {
        useEmulatorStore.getState().sendInput(e, 1);
      }
    },
    [mode]
  );

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/games")}
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            ← Games
          </button>
          {game && (
            <span className="text-white text-sm font-medium">{game.title}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* FPS counter */}
          {emulatorStatus === "running" && (
            <span className="text-xs text-zinc-400 font-mono">{fps} FPS</span>
          )}

          {/* Pause/Resume */}
          <button
            onClick={() => useEmulatorStore.getState().togglePause()}
            disabled={
              emulatorStatus !== "running" && emulatorStatus !== "paused"
            }
            className="text-xs text-zinc-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            {emulatorStatus === "paused" ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      </div>

      {/* Main emulator area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <EmulatorCanvas
          mode={mode}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className="w-full max-w-3xl"
        />
      </div>

      {/* Session overlay for Mode 3/4 — shows code + connected devices */}
      {(mode === 3 || mode === 4) && (
        <SessionOverlay
          sessionCode={sessionCode}
          connectedDevices={connectedDevices}
          maxControllers={mode === 3 ? 1 : 4}
        />
      )}

      {/* Bottom controls bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-zinc-900 border-t border-zinc-800">
        <ModeSelector
          currentMode={mode}
          onModeChange={setMode}
          isPro={isPro}
        />

        <SaveStateControls maxSlots={maxSaveSlots} />
      </div>
    </div>
  );
}
