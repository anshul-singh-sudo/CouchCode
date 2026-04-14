"use client";

interface Device {
  token: string;
  role: "host" | "display" | "controller";
  playerSlot: number | null;
}

interface SessionOverlayProps {
  sessionCode: string | null;
  connectedDevices: Device[];
  maxControllers?: number; // 1 for Mode 3, 4 for Mode 4
}

const SLOT_COLORS: Record<number, string> = {
  1: "#6366f1", // indigo
  2: "#22c55e", // green
  3: "#f59e0b", // amber
  4: "#ef4444", // red
};

export default function SessionOverlay({
  sessionCode,
  connectedDevices,
  maxControllers = 4,
}: SessionOverlayProps) {
  const controllers = connectedDevices.filter((d) => d.role === "controller");
  const joinUrl =
    typeof window !== "undefined" && sessionCode
      ? `${window.location.origin}/join/${sessionCode}`
      : null;

  return (
    <div className="mx-4 mb-2 rounded-lg border border-zinc-700 bg-zinc-900/90 px-4 py-3 flex flex-wrap items-center gap-4">
      {/* Session code */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Session code:</span>
        {sessionCode ? (
          <span className="font-mono text-lg font-bold tracking-widest text-yellow-400">
            {sessionCode}
          </span>
        ) : (
          <span className="text-xs text-zinc-500 animate-pulse">Creating…</span>
        )}
      </div>

      {/* Join URL hint */}
      {joinUrl && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Join at</span>
          <span className="font-mono text-zinc-300 truncate max-w-[200px]">
            {joinUrl}
          </span>
        </div>
      )}

      {/* Connected controller slots (Req 12.3) */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-zinc-400">Controllers:</span>
        {Array.from({ length: maxControllers }, (_, i) => i + 1).map((slot) => {
          const device = controllers.find((d) => d.playerSlot === slot);
          return (
            <div
              key={slot}
              title={device ? `P${slot} connected` : `P${slot} waiting`}
              style={{
                background: device ? SLOT_COLORS[slot] : "transparent",
                border: `2px solid ${SLOT_COLORS[slot] ?? "#6366f1"}`,
                color: device ? "#fff" : SLOT_COLORS[slot],
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                opacity: device ? 1 : 0.4,
                transition: "all 0.2s",
              }}
            >
              P{slot}
            </div>
          );
        })}
      </div>
    </div>
  );
}
