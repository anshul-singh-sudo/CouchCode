"use client";

import { useRef, useEffect, useCallback } from "react";
import { useEmulatorStore } from "@/stores/emulatorStore";

interface EmulatorCanvasProps {
  mode?: 1 | 2 | 3 | 4;
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  className?: string;
}

export default function EmulatorCanvas({
  mode = 1,
  onKeyDown,
  onKeyUp,
  className,
}: EmulatorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const status = useEmulatorStore((s) => s.status);

  // Attach canvas ref to emulator store so the worker can render into it
  useEffect(() => {
    const store = useEmulatorStore.getState();
    if (canvasRef.current && "setCanvas" in store) {
      (store as { setCanvas: (c: HTMLCanvasElement) => void }).setCanvas(
        canvasRef.current
      );
    }
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser shortcuts for game keys
      const gameKeys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        "Shift",
        "z",
        "x",
        "a",
        "s",
        "q",
        "w",
        "Z",
        "X",
        "A",
        "S",
        "Q",
        "W",
      ];
      if (gameKeys.includes(e.key)) e.preventDefault();
      onKeyDown?.(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      onKeyUp?.(e);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  // Fullscreen toggle via Fullscreen API (Req 1.9)
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  if (mode === 2) {
    // Mode 2: horizontal split-screen — P1 top half, P2 bottom half (Req 10.2)
    return (
      <div
        ref={containerRef}
        className={`relative bg-black flex flex-col ${className ?? ""}`}
        style={{ aspectRatio: "4/3" }}
      >
        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">Loading game…</p>
          </div>
        )}
        {/* Error overlay */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
            <p className="text-red-400 text-sm mb-2">Failed to load game</p>
            <button
              className="text-white underline text-xs"
              onClick={() => useEmulatorStore.getState().setStatus("idle")}
            >
              Dismiss
            </button>
          </div>
        )}
        {/* P1 top half */}
        <div className="flex-1 flex items-center justify-center border-b border-zinc-700 relative">
          <span className="absolute top-1 left-2 text-xs text-zinc-400 font-mono z-10">P1</span>
          <canvas
            ref={canvasRef}
            id="emulator-canvas"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            className="block"
          />
        </div>
        {/* P2 bottom half — mirrors the same canvas output */}
        <div className="flex-1 flex items-center justify-center relative">
          <span className="absolute top-1 left-2 text-xs text-zinc-400 font-mono z-10">P2</span>
          <canvas
            id="emulator-canvas-p2"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            className="block opacity-80"
          />
        </div>
        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          className="absolute bottom-2 right-2 z-20 bg-black/50 hover:bg-black/80 text-white rounded p-1 text-xs transition-colors"
        >
          ⛶
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-black flex items-center justify-center ${className ?? ""}`}
      style={{ aspectRatio: "4/3" }}
    >
      {/* Loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white text-sm">Loading game…</p>
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
          <p className="text-red-400 text-sm mb-2">Failed to load game</p>
          <button
            className="text-white underline text-xs"
            onClick={() => useEmulatorStore.getState().setStatus("idle")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Game canvas (Req 1.8) */}
      <canvas
        ref={canvasRef}
        id="emulator-canvas"
        style={{ width: "100%", height: "100%" }}
        className="block"
      />

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        aria-label="Toggle fullscreen"
        className="absolute bottom-2 right-2 z-20 bg-black/50 hover:bg-black/80 text-white rounded p-1 text-xs transition-colors"
      >
        ⛶
      </button>
    </div>
  );
}
