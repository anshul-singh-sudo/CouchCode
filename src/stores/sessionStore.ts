/**
 * Session store — manages WebSocket signaling, WebRTC P2P, and relay fallback.
 * Requirements: 5.3, 5.4, 5.6, 6.1, 6.3, 6.4, 6.5
 */
import { create } from "zustand";
import { serializeInputEvent } from "@/lib/inputEvent";
import {
  createPeerConnection,
  createDataChannel,
  waitForConnection,
} from "@/lib/webrtc";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "wss://couchcode-ws.fly.dev";

// Exponential backoff: 1s, 2s, 4s, max 30s
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

interface Device {
  token: string;
  role: "host" | "display" | "controller";
  playerSlot: number | null;
}

interface InputEventData {
  playerId: number;
  buttonId: number;
  state: 0 | 1;
  timestamp: number;
}

interface SessionStore {
  sessionCode: string | null;
  role: "host" | "display" | "controller" | null;
  connectedDevices: Device[];
  connectionType: "webrtc" | "relay" | null;
  latency: number;

  // Internal (not exposed in interface but needed for logic)
  _ws: WebSocket | null;
  _pc: RTCPeerConnection | null;
  _dc: RTCDataChannel | null;
  _deviceToken: string | null;
  _reconnectAttempt: number;
  _reconnectTimer: ReturnType<typeof setTimeout> | null;

  createSession: (gameId: string, mode?: 3 | 4) => Promise<string>;
  joinSession: (code: string) => Promise<void>;
  sendInput: (event: InputEventData) => void;
  disconnect: () => void;

  // Internal setters
  setSessionCode: (code: string | null) => void;
  setRole: (role: SessionStore["role"]) => void;
  setConnectionType: (type: SessionStore["connectionType"]) => void;
  setLatency: (latency: number) => void;
  addDevice: (device: Device) => void;
  removeDevice: (token: string) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessionCode: null,
  role: null,
  connectedDevices: [],
  connectionType: null,
  latency: 0,

  _ws: null,
  _pc: null,
  _dc: null,
  _deviceToken: null,
  _reconnectAttempt: 0,
  _reconnectTimer: null,

  // ─── Public API ────────────────────────────────────────────────────────────

  createSession: async (gameId: string, mode: 3 | 4 = 3): Promise<string> => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, mode }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Failed to create session");
    }

    const { code } = await res.json();
    set({ sessionCode: code, role: "host" });

    // Connect to WS server
    await connectWs(code, "display");

    return code;
  },

  joinSession: async (code: string): Promise<void> => {
    const res = await fetch(`/api/sessions/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "controller" }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Failed to join session");
    }

    const { deviceToken, role } = await res.json();
    set({ sessionCode: code, role, _deviceToken: deviceToken });

    // Connect to WS server and negotiate WebRTC
    await connectWs(code, role as "display" | "controller");
  },

  sendInput: (event: InputEventData): void => {
    const { _dc, _ws, connectionType, sessionCode } = get();

    const bytes = serializeInputEvent(event);

    if (connectionType === "webrtc" && _dc?.readyState === "open") {
      _dc.send(bytes);
    } else if (_ws?.readyState === WebSocket.OPEN && sessionCode) {
      // Relay via WebSocket as binary frame
      _ws.send(bytes);
    }
  },

  disconnect: (): void => {
    const { _ws, _pc, _reconnectTimer } = get();
    if (_reconnectTimer) clearTimeout(_reconnectTimer);
    _ws?.close();
    _pc?.close();
    set({
      sessionCode: null,
      role: null,
      connectedDevices: [],
      connectionType: null,
      latency: 0,
      _ws: null,
      _pc: null,
      _dc: null,
      _deviceToken: null,
      _reconnectAttempt: 0,
      _reconnectTimer: null,
    });
  },

  // ─── Internal setters ──────────────────────────────────────────────────────

  setSessionCode: (code) => set({ sessionCode: code }),
  setRole: (role) => set({ role }),
  setConnectionType: (type) => set({ connectionType: type }),
  setLatency: (latency) => set({ latency }),

  addDevice: (device) =>
    set((state) => ({
      connectedDevices: [...state.connectedDevices, device],
    })),

  removeDevice: (token) =>
    set((state) => ({
      connectedDevices: state.connectedDevices.filter((d) => d.token !== token),
    })),
}));

// ─── WebSocket Connection Logic ───────────────────────────────────────────────

async function connectWs(sessionCode: string, role: "display" | "controller"): Promise<void> {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    useSessionStore.setState({ _ws: ws, connectionType: "relay" });

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      // Reset reconnect counter on successful connection
      useSessionStore.setState({ _reconnectAttempt: 0 });

      // Authenticate — use a placeholder token; in production this comes from the session cookie
      // The WS server verifies the JWT; here we send the NextAuth session token
      const token = getAuthToken();
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary relay input — pass to emulator input handler
        handleRelayInput(event.data);
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      switch (msg.type) {
        case "authenticated":
          // Now join or create the session on the WS server
          if (role === "display") {
            ws.send(JSON.stringify({ type: "join_session", code: sessionCode, role: "display" }));
          } else {
            ws.send(JSON.stringify({ type: "join_session", code: sessionCode, role: "controller" }));
          }
          resolve();
          break;

        case "device_joined": {
          const device: Device = {
            token: msg.deviceToken as string,
            role: msg.role as Device["role"],
            playerSlot: (msg.playerSlot as number | null) ?? null,
          };
          useSessionStore.getState().addDevice(device);

          // If we're the display and a controller joined, initiate WebRTC offer
          const state = useSessionStore.getState();
          if (state.role === "display" && msg.role === "controller") {
            await initiateWebRTC(ws, msg.deviceToken as string);
          }
          break;
        }

        case "offer":
          await handleOffer(ws, msg);
          break;

        case "answer":
          await handleAnswer(msg);
          break;

        case "ice_candidate":
          await handleIceCandidate(msg);
          break;

        case "device_disconnected":
          useSessionStore.getState().removeDevice(msg.deviceToken as string);
          break;

        case "session_terminated":
          useSessionStore.getState().disconnect();
          break;

        case "error":
          console.error("WS server error:", msg.code, msg.message);
          break;
      }
    };

    ws.onclose = () => {
      scheduleReconnect(sessionCode, role);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  });
}

function scheduleReconnect(sessionCode: string, role: "display" | "controller"): void {
  const state = useSessionStore.getState();
  const attempt = state._reconnectAttempt;
  const delay = BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];

  const timer = setTimeout(() => {
    useSessionStore.setState({ _reconnectAttempt: attempt + 1 });
    connectWs(sessionCode, role).catch(console.error);
  }, delay);

  useSessionStore.setState({ _reconnectTimer: timer });
}

// ─── WebRTC Negotiation ───────────────────────────────────────────────────────

async function initiateWebRTC(ws: WebSocket, targetToken: string): Promise<void> {
  const pc = createPeerConnection();
  const dc = createDataChannel(pc);

  useSessionStore.setState({ _pc: pc, _dc: dc });

  // Forward ICE candidates to the target device
  pc.onicecandidate = (event) => {
    if (event.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "ice_candidate",
          candidate: event.candidate.toJSON(),
          to: targetToken,
        })
      );
    }
  };

  dc.onopen = () => {
    useSessionStore.setState({ connectionType: "webrtc" });
  };

  dc.onclose = () => {
    useSessionStore.setState({ connectionType: "relay" });
  };

  // Measure latency via ping/pong
  dc.onmessage = (event) => {
    if (typeof event.data === "string") {
      try {
        const msg = JSON.parse(event.data) as { type: string; t: number };
        if (msg.type === "pong") {
          useSessionStore.setState({ latency: Date.now() - msg.t });
        }
      } catch {
        // not a control message — ignore
      }
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  ws.send(JSON.stringify({ type: "offer", sdp: offer, to: targetToken }));

  // Start connection timeout → relay fallback
  waitForConnection(pc).then((type) => {
    useSessionStore.setState({ connectionType: type });
  });
}

async function handleOffer(ws: WebSocket, msg: Record<string, unknown>): Promise<void> {
  const pc = createPeerConnection();
  useSessionStore.setState({ _pc: pc });

  pc.onicecandidate = (event) => {
    if (event.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "ice_candidate",
          candidate: event.candidate.toJSON(),
          to: msg.from as string,
        })
      );
    }
  };

  pc.ondatachannel = (event) => {
    const dc = event.channel;
    useSessionStore.setState({ _dc: dc });

    dc.onopen = () => {
      useSessionStore.setState({ connectionType: "webrtc" });
    };

    dc.onclose = () => {
      useSessionStore.setState({ connectionType: "relay" });
    };

    dc.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        handleRelayInput(e.data);
      }
    };
  };

  await pc.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  ws.send(JSON.stringify({ type: "answer", sdp: answer, to: msg.from as string }));

  waitForConnection(pc).then((type) => {
    useSessionStore.setState({ connectionType: type });
  });
}

async function handleAnswer(msg: Record<string, unknown>): Promise<void> {
  const { _pc } = useSessionStore.getState();
  if (!_pc) return;
  await _pc.setRemoteDescription(msg.sdp as RTCSessionDescriptionInit);
}

async function handleIceCandidate(msg: Record<string, unknown>): Promise<void> {
  const { _pc } = useSessionStore.getState();
  if (!_pc) return;
  try {
    await _pc.addIceCandidate(new RTCIceCandidate(msg.candidate as RTCIceCandidateInit));
  } catch (err) {
    console.error("Failed to add ICE candidate:", err);
  }
}

// ─── Relay Input Handler ──────────────────────────────────────────────────────

function handleRelayInput(data: ArrayBuffer): void {
  // Dispatch to emulator input handler via custom event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("couchcode:input", { detail: new Uint8Array(data) })
    );
  }
}

// ─── Auth Token Helper ────────────────────────────────────────────────────────

function getAuthToken(): string {
  // In production, retrieve the NextAuth session token from the cookie.
  // The WS server verifies this JWT. For guest users, use the guest-token cookie.
  if (typeof document === "undefined") return "";
  const cookies = document.cookie.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith("next-auth.session-token=")) {
      return cookie.split("=")[1] ?? "";
    }
    if (cookie.startsWith("guest-token=")) {
      return cookie.split("=")[1] ?? "";
    }
  }
  return "";
}
