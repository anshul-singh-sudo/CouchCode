/**
 * EmulatorJS Wrapper
 *
 * Defines the interface for EmulatorJS integration and provides a stub/mock
 * implementation for development. In production, this would be wired to the
 * actual EmulatorJS library loaded via next/dynamic with ssr: false.
 *
 * Architecture:
 *  - EmulatorJS core runs in a dedicated Web Worker
 *  - SharedArrayBuffer is used for zero-copy frame buffer sharing
 *    (requires COOP: same-origin + COEP: require-corp headers — set in next.config.ts)
 *  - AudioWorklet handles low-latency audio output via Web Audio API
 */

export type System = "nes" | "snes" | "gba" | "n64" | "psp" | "ps2";

export interface EmulatorJSConfig {
  /** Canvas element to render into */
  canvas: HTMLCanvasElement;
  /** Game system identifier */
  system: System;
  /** ROM data as ArrayBuffer */
  rom: ArrayBuffer;
  /** Called when emulator is ready to run */
  onReady?: () => void;
  /** Called each frame with current FPS */
  onFpsUpdate?: (fps: number) => void;
  /** Called on error */
  onError?: (err: Error) => void;
}

export interface EmulatorJSInstance {
  /** Start emulation */
  start(): void;
  /** Pause emulation */
  pause(): void;
  /** Resume emulation */
  resume(): void;
  /** Stop and clean up */
  destroy(): void;
  /** Serialize current game state to Uint8Array */
  saveState(): Promise<Uint8Array>;
  /** Restore game state from Uint8Array */
  loadState(state: Uint8Array): Promise<void>;
  /** Send a button input event to the emulator input poll loop */
  sendInput(playerId: number, buttonId: number, pressed: boolean): void;
}

/**
 * Stub implementation used in development / testing.
 * Simulates the EmulatorJS interface without a real WASM core.
 */
class EmulatorJSStub implements EmulatorJSInstance {
  private canvas: HTMLCanvasElement;
  private animFrameId: number | null = null;
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private config: EmulatorJSConfig;

  // SharedArrayBuffer frame buffer (requires COOP/COEP headers)
  private frameBuffer: SharedArrayBuffer | null = null;
  private frameView: Uint8ClampedArray | null = null;

  constructor(config: EmulatorJSConfig) {
    this.canvas = config.canvas;
    this.config = config;

    // Allocate SharedArrayBuffer for frame data (320x240 RGBA = 307200 bytes)
    if (typeof SharedArrayBuffer !== "undefined") {
      this.frameBuffer = new SharedArrayBuffer(320 * 240 * 4);
      this.frameView = new Uint8ClampedArray(this.frameBuffer);
    }
  }

  start(): void {
    this.config.onReady?.();
    this._renderLoop();
  }

  pause(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  resume(): void {
    if (this.animFrameId === null) {
      this._renderLoop();
    }
  }

  destroy(): void {
    this.pause();
    const ctx = this.canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  async saveState(): Promise<Uint8Array> {
    // In production: postMessage to worker, await response with state blob
    // Stub: return a minimal placeholder state
    const state = new Uint8Array(64);
    state[0] = 0xcc; // magic marker
    state[1] = 0x00;
    return state;
  }

  async loadState(state: Uint8Array): Promise<void> {
    // In production: postMessage to worker with state blob
    console.log("[EmulatorJS stub] loadState called, bytes:", state.length);
  }

  sendInput(playerId: number, buttonId: number, pressed: boolean): void {
    // In production: postMessage to worker input poll loop
    // Binary format: [playerId, buttonId, state, ...timestamp uint32 LE]
    console.log(
      `[EmulatorJS stub] input: player=${playerId} button=${buttonId} pressed=${pressed}`
    );
  }

  private _renderLoop(): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 1000) {
        const fps = Math.round(
          (this.frameCount * 1000) / (now - this.lastFpsTime)
        );
        this.config.onFpsUpdate?.(fps);
        this.frameCount = 0;
        this.lastFpsTime = now;
      }

      // Render stub frame: solid color with frame counter
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "#e94560";
      ctx.font = "16px monospace";
      ctx.fillText("EmulatorJS (stub)", 20, 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px monospace";
      ctx.fillText(`System: ${this.config.system}`, 20, 70);
      ctx.fillText(`Frame: ${this.frameCount}`, 20, 90);

      this.animFrameId = requestAnimationFrame(draw);
    };

    this.animFrameId = requestAnimationFrame(draw);
  }
}

/**
 * Factory: creates an EmulatorJS instance.
 * In production, swap this for the real EmulatorJS initialization.
 */
export async function createEmulator(
  config: EmulatorJSConfig
): Promise<EmulatorJSInstance> {
  // Set canvas dimensions
  config.canvas.width = 320;
  config.canvas.height = 240;

  return new EmulatorJSStub(config);
}
