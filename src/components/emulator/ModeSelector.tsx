"use client";

interface ModeSelectorProps {
  currentMode: 1 | 2 | 3 | 4;
  onModeChange: (mode: 1 | 2 | 3 | 4) => void;
  isPro?: boolean;
}

const MODES = [
  { id: 1 as const, label: "Solo", description: "Single device, single player" },
  { id: 2 as const, label: "Local 2P", description: "Two players, one device", proOnly: true },
  { id: 3 as const, label: "Phone Ctrl", description: "Phone as controller", proOnly: true },
  { id: 4 as const, label: "Multi Ctrl", description: "Up to 4 controllers", proOnly: true },
];

export default function ModeSelector({
  currentMode,
  onModeChange,
  isPro = false,
}: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Mode:</span>
      {MODES.map((mode) => {
        const locked = mode.proOnly && !isPro;
        return (
          <button
            key={mode.id}
            onClick={() => !locked && onModeChange(mode.id)}
            disabled={locked}
            title={locked ? "Pro tier required" : mode.description}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              currentMode === mode.id
                ? "bg-primary text-primary-foreground border-primary"
                : locked
                ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                : "border-border hover:bg-accent"
            }`}
          >
            {mode.label}
            {locked && " 🔒"}
          </button>
        );
      })}
    </div>
  );
}
