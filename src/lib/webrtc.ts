/**
 * WebRTC P2P connection utilities.
 * Requirements: 5.1, 5.2, 5.3, 5.7
 */

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const CONNECTION_TIMEOUT_MS = 10_000;

export interface PeerConnectionResult {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  connectionType: "webrtc" | "relay";
}

/**
 * Create a new RTCPeerConnection with Google STUN servers.
 * DataChannel is configured for UDP-like low latency: ordered=false, maxRetransmits=0.
 */
export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: STUN_SERVERS,
  });
}

/**
 * Create a DataChannel on the given peer connection with low-latency settings.
 */
export function createDataChannel(pc: RTCPeerConnection, label = "input"): RTCDataChannel {
  return pc.createDataChannel(label, {
    ordered: false,
    maxRetransmits: 0,
  });
}

/**
 * Detect if two ICE candidates are on the same local network by comparing
 * the first three octets of their IP addresses (subnet prefix).
 */
export function isSameNetwork(candidateA: string, candidateB: string): boolean {
  const ipA = extractIp(candidateA);
  const ipB = extractIp(candidateB);
  if (!ipA || !ipB) return false;

  const partsA = ipA.split(".");
  const partsB = ipB.split(".");
  if (partsA.length !== 4 || partsB.length !== 4) return false;

  // Compare first 3 octets (class C subnet)
  return partsA[0] === partsB[0] && partsA[1] === partsB[1] && partsA[2] === partsB[2];
}

function extractIp(candidate: string): string | null {
  // RTCIceCandidate.candidate string format:
  // "candidate:<foundation> <component> <protocol> <priority> <ip> <port> ..."
  const parts = candidate.split(" ");
  if (parts.length < 6) return null;
  return parts[4] ?? null;
}

/**
 * Wait for a WebRTC connection to be established with a 10-second timeout.
 * Resolves with "webrtc" if connected, "relay" if timed out.
 */
export function waitForConnection(pc: RTCPeerConnection): Promise<"webrtc" | "relay"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve("relay");
    }, CONNECTION_TIMEOUT_MS);

    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        clearTimeout(timer);
        resolve("webrtc");
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        clearTimeout(timer);
        resolve("relay");
      }
    });
  });
}
