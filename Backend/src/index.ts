import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { jwtVerify } from "jose";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production"
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeviceInfo {
  ws: WebSocket;
  token: string;
  sessionCode: string | null;
  role: "display" | "controller" | null;
  playerSlot: number | null;
}

interface SessionInfo {
  code: string;
  gameId: string;
  hostToken: string;
  devices: Map<string, DeviceInfo>; // deviceToken → DeviceInfo
  displayToken: string | null;
}

type SignalingMessage =
  | { type: "auth"; token: string }
  | { type: "create_session"; gameId: string }
  | { type: "join_session"; code: string; role: "display" | "controller" }
  | { type: "offer"; sdp: object; to: string }
  | { type: "answer"; sdp: object; to: string }
  | { type: "ice_candidate"; candidate: object; to: string };

// ─── State ────────────────────────────────────────────────────────────────────

// deviceToken → DeviceInfo (authenticated connections)
const devices = new Map<string, DeviceInfo>();
// sessionCode → SessionInfo
const sessions = new Map<string, SessionInfo>();
// ws → deviceToken (for disconnect lookup)
const wsToToken = new Map<WebSocket, string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

function generateUniqueCode(): string {
  let code = generateCode();
  while (sessions.has(code)) {
    code = generateCode();
  }
  return code;
}

function send(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendError(ws: WebSocket, code: string, message: string): void {
  send(ws, { type: "error", code, message });
}

// ─── Message Handlers ─────────────────────────────────────────────────────────

async function handleAuth(ws: WebSocket, msg: { type: "auth"; token: string }): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(msg.token, JWT_SECRET);
    const sub = payload.sub as string;
    if (!sub) {
      sendError(ws, "UNAUTHORIZED", "Invalid token: missing sub");
      return null;
    }
    return sub;
  } catch {
    sendError(ws, "UNAUTHORIZED", "Invalid or expired token");
    return null;
  }
}

function handleCreateSession(ws: WebSocket, deviceToken: string, msg: { type: "create_session"; gameId: string }): void {
  const device = devices.get(deviceToken);
  if (!device) {
    sendError(ws, "UNAUTHORIZED", "Not authenticated");
    return;
  }

  const code = generateUniqueCode();
  const session: SessionInfo = {
    code,
    gameId: msg.gameId,
    hostToken: deviceToken,
    devices: new Map([[deviceToken, device]]),
    displayToken: deviceToken,
  };

  device.sessionCode = code;
  device.role = "display";
  device.playerSlot = null;

  sessions.set(code, session);
  send(ws, { type: "session_created", code });
}

function handleJoinSession(ws: WebSocket, deviceToken: string, msg: { type: "join_session"; code: string; role: "display" | "controller" }): void {
  const device = devices.get(deviceToken);
  if (!device) {
    sendError(ws, "UNAUTHORIZED", "Not authenticated");
    return;
  }

  const session = sessions.get(msg.code);
  if (!session) {
    sendError(ws, "SESSION_NOT_FOUND", "Session not found");
    return;
  }

  if (session.devices.size >= 5) {
    sendError(ws, "SESSION_FULL", "Session already has the maximum number of devices");
    return;
  }

  // Assign player slot for controllers
  let playerSlot: number | null = null;
  if (msg.role === "controller") {
    const usedSlots = new Set(
      Array.from(session.devices.values())
        .filter((d) => d.role === "controller" && d.playerSlot !== null)
        .map((d) => d.playerSlot!)
    );
    for (let slot = 1; slot <= 4; slot++) {
      if (!usedSlots.has(slot)) {
        playerSlot = slot;
        break;
      }
    }
  }

  device.sessionCode = msg.code;
  device.role = msg.role;
  device.playerSlot = playerSlot;

  if (msg.role === "display") {
    session.displayToken = deviceToken;
  }

  session.devices.set(deviceToken, device);

  // Notify all other devices in the session
  for (const [token, d] of session.devices) {
    if (token !== deviceToken) {
      send(d.ws, {
        type: "device_joined",
        deviceToken,
        role: msg.role,
        playerSlot,
      });
    }
  }

  // Confirm to the joining device
  send(ws, {
    type: "device_joined",
    deviceToken,
    role: msg.role,
    playerSlot,
  });
}

function handleSignaling(ws: WebSocket, deviceToken: string, msg: { type: "offer" | "answer" | "ice_candidate"; sdp?: object; candidate?: object; to: string }): void {
  const session = getDeviceSession(deviceToken);
  if (!session) {
    sendError(ws, "SESSION_NOT_FOUND", "Not in a session");
    return;
  }

  const target = session.devices.get(msg.to);
  if (!target) {
    sendError(ws, "DEVICE_NOT_FOUND", "Target device not found");
    return;
  }

  // Forward the signaling message with `from` field
  send(target.ws, { ...msg, from: deviceToken });
}

function getDeviceSession(deviceToken: string): SessionInfo | null {
  const device = devices.get(deviceToken);
  if (!device?.sessionCode) return null;
  return sessions.get(device.sessionCode) ?? null;
}

function handleDisconnect(ws: WebSocket): void {
  const deviceToken = wsToToken.get(ws);
  if (!deviceToken) return;

  wsToToken.delete(ws);
  const device = devices.get(deviceToken);
  if (!device) return;

  devices.delete(deviceToken);

  const session = device.sessionCode ? sessions.get(device.sessionCode) : null;
  if (!session) return;

  session.devices.delete(deviceToken);

  // Notify remaining devices
  for (const d of session.devices.values()) {
    send(d.ws, { type: "device_disconnected", deviceToken });
  }

  // Clean up empty sessions
  if (session.devices.size === 0) {
    sessions.delete(session.code);
  }
}

// ─── Server Setup ─────────────────────────────────────────────────────────────

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("CouchCode WebSocket Signaling Server");
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  let deviceToken: string | null = null;
  let authenticated = false;

  ws.on("message", async (data, isBinary) => {
    // Binary frames: relay to display device
    if (isBinary) {
      if (!deviceToken) return;
      const session = getDeviceSession(deviceToken);
      if (!session?.displayToken) return;
      const display = session.devices.get(session.displayToken);
      if (display && display.ws !== ws) {
        display.ws.send(data);
      }
      return;
    }

    let msg: SignalingMessage;
    try {
      msg = JSON.parse(data.toString()) as SignalingMessage;
    } catch {
      sendError(ws, "INVALID_INPUT", "Invalid JSON");
      return;
    }

    // Auth must be first message
    if (!authenticated) {
      if (msg.type !== "auth") {
        sendError(ws, "UNAUTHORIZED", "Must authenticate first");
        return;
      }
      const sub = await handleAuth(ws, msg);
      if (!sub) return;

      deviceToken = sub;
      authenticated = true;

      // Register device
      const deviceInfo: DeviceInfo = {
        ws,
        token: deviceToken,
        sessionCode: null,
        role: null,
        playerSlot: null,
      };
      devices.set(deviceToken, deviceInfo);
      wsToToken.set(ws, deviceToken);

      send(ws, { type: "authenticated", deviceToken });
      return;
    }

    if (!deviceToken) return;

    switch (msg.type) {
      case "create_session":
        handleCreateSession(ws, deviceToken, msg);
        break;
      case "join_session":
        handleJoinSession(ws, deviceToken, msg);
        break;
      case "offer":
      case "answer":
      case "ice_candidate":
        handleSignaling(ws, deviceToken, msg as { type: "offer" | "answer" | "ice_candidate"; sdp?: object; candidate?: object; to: string });
        break;
      default:
        sendError(ws, "INVALID_INPUT", "Unknown message type");
    }
  });

  ws.on("close", () => {
    handleDisconnect(ws);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    handleDisconnect(ws);
  });
});

httpServer.listen(PORT, () => {
  console.log(`CouchCode WS server listening on port ${PORT}`);
});
