import { create } from "zustand";
import type { EmulatorJSInstance } from "@/lib/emulatorjs/EmulatorJSWrapper";
import { resolveKeyToButton } from "@/lib/inputMap";

export type System = "nes" | "snes" | "gba" | "n64" | "psp" | "ps2";

export interface Game {
  id: string;
  title: string;
  slug: string;
  system: System;
}

interface EmulatorStore {
  status: "idle" | "loading" | "running" | "paused" | "error";
  currentGame: Game | null;
  fps: number;
  loadProgress: number; // 0–100
  canvas: HTMLCanvasElement | null;
  emulatorInstance: EmulatorJSInstance | null;

  // Actions
  setCanvas: (canvas: HTMLCanvasElement) => void;
  setStatus: (status: EmulatorStore["status"]) => void;
  setFps: (fps: number) => void;

  /**
   * Load a ROM from a signed URL and start emulation.
   * Supports chunked streaming for ROMs > 10 MB (Req 1.2, 1.3, 14.3, 14.5).
   */
  loadROM: (url: string, system: System, game?: Game) => Promise<void>;

  /**
   * Send a keyboard input event to the emulator (Req 9.2, 9.4, 9.5).
   */
  sendInput: (event: KeyboardEvent, playerId?: 1 | 2) => void;

  /**
   * Save current emulator state to slot and upload to R2 (Req 2.1, 2.2).
   */
  saveState: (slot: number) => Promise<void>;

  /**
   * Load emulator state from slot (Req 2.3).
   */
  loadState: (slot: number) => Promise<void>;

  togglePause: () => void;
}

const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10 MB

export const useEmulatorStore = create<EmulatorStore>((set, get) => ({
  status: "idle",
  currentGame: null,
  fps: 0,
  loadProgress: 0,
  canvas: null,
  emulatorInstance: null,

  setCanvas: (canvas) => set({ canvas }),
  setStatus: (status) => set({ status }),
  setFps: (fps) => set({ fps }),

  loadROM: async (url: string, system: System, game?: Game) => {
    const { canvas } = get();
    if (!canvas) {
      console.error("[emulatorStore] No canvas attached");
      set({ status: "error" });
      return;
    }

    set({ status: "loading", loadProgress: 0, currentGame: game ?? null });

    try {
      // Fetch ROM with progress tracking (chunked streaming for > 10 MB)
      const response = await fetch(url);
      if (!response.ok) throw new Error(`ROM fetch failed: ${response.status}`);

      const contentLength = Number(response.headers.get("content-length") ?? 0);
      let romBuffer: ArrayBuffer;

      if (contentLength > CHUNK_THRESHOLD && response.body) {
        // Chunked streaming
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          const progress = contentLength
            ? Math.round((received / contentLength) * 90)
            : 50;
          set({ loadProgress: progress });
        }

        // Concatenate chunks
        const total = chunks.reduce((acc, c) => acc + c.length, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        romBuffer = merged.buffer;
      } else {
        romBuffer = await response.arrayBuffer();
        set({ loadProgress: 90 });
      }

      // Dynamically import EmulatorJS wrapper (client-only, ssr: false equivalent)
      const { createEmulator } = await import(
        "@/lib/emulatorjs/EmulatorJSWrapper"
      );

      const instance = await createEmulator({
        canvas,
        system,
        rom: romBuffer,
        onReady: () => {
          set({ status: "running", loadProgress: 100 });
        },
        onFpsUpdate: (fps) => set({ fps }),
        onError: (err) => {
          console.error("[EmulatorJS] error:", err);
          set({ status: "error" });
        },
      });

      set({ emulatorInstance: instance });
      instance.start();

      // Enforce 5-second initialization timeout (Req 1.3)
      setTimeout(() => {
        const { status } = get();
        if (status === "loading") {
          console.warn("[emulatorStore] Initialization timeout");
          set({ status: "error" });
        }
      }, 5000);
    } catch (err) {
      console.error("[emulatorStore] loadROM error:", err);
      set({ status: "error" });
    }
  },

  sendInput: (event: KeyboardEvent, playerId: 1 | 2 = 1) => {
    const { emulatorInstance } = get();
    if (!emulatorInstance) return;

    const buttonId = resolveKeyToButton(event.key, event.code, playerId);
    if (buttonId === undefined) return;

    const pressed = event.type === "keydown";
    emulatorInstance.sendInput(playerId, buttonId, pressed);
  },

  saveState: async (slot: number) => {
    const { emulatorInstance, currentGame, canvas } = get();
    if (!emulatorInstance || !currentGame) {
      console.warn("[emulatorStore] saveState: no emulator or game");
      return;
    }

    try {
      const stateBlob = await emulatorInstance.saveState();

      // Capture thumbnail from canvas
      let thumbnailBlob: Blob | null = null;
      if (canvas) {
        thumbnailBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.8)
        );
      }

      // Request signed PUT URLs from API
      const res = await fetch("/api/save-states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: currentGame.id, slotNumber: slot }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message ?? "Failed to create save state");
      }

      const { stateUploadUrl, thumbnailUploadUrl } = await res.json();

      // Upload state blob to R2
      await fetch(stateUploadUrl, {
        method: "PUT",
        body: stateBlob,
        headers: { "Content-Type": "application/octet-stream" },
      });

      // Upload thumbnail if available
      if (thumbnailBlob && thumbnailUploadUrl) {
        await fetch(thumbnailUploadUrl, {
          method: "PUT",
          body: thumbnailBlob,
          headers: { "Content-Type": "image/jpeg" },
        });
      }

      console.log(`[emulatorStore] State saved to slot ${slot}`);
    } catch (err) {
      console.error("[emulatorStore] saveState error:", err);
    }
  },

  loadState: async (slot: number) => {
    const { emulatorInstance, currentGame } = get();
    if (!emulatorInstance || !currentGame) {
      console.warn("[emulatorStore] loadState: no emulator or game");
      return;
    }

    try {
      // Fetch signed GET URL for the state blob
      const res = await fetch(
        `/api/save-states/${currentGame.id}?slot=${slot}`
      );
      if (!res.ok) throw new Error("Failed to fetch save state URL");

      const { stateUrl } = await res.json();
      const stateRes = await fetch(stateUrl);
      if (!stateRes.ok) throw new Error("Failed to download save state");

      const buffer = await stateRes.arrayBuffer();
      const stateBlob = new Uint8Array(buffer);

      await emulatorInstance.loadState(stateBlob);
      console.log(`[emulatorStore] State loaded from slot ${slot}`);
    } catch (err) {
      console.error("[emulatorStore] loadState error:", err);
    }
  },

  togglePause: () => {
    const { status, emulatorInstance } = get();
    if (status === "running") {
      emulatorInstance?.pause();
      set({ status: "paused" });
    } else if (status === "paused") {
      emulatorInstance?.resume();
      set({ status: "running" });
    }
  },
}));
