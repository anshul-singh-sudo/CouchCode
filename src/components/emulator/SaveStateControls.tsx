"use client";

import { useState } from "react";
import { useEmulatorStore } from "@/stores/emulatorStore";
import { Button } from "@/components/ui/button";

interface SaveStateControlsProps {
  maxSlots?: number;
}

export default function SaveStateControls({ maxSlots = 1 }: SaveStateControlsProps) {
  const [activeSlot, setActiveSlot] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const status = useEmulatorStore((s) => s.status);

  const isRunning = status === "running" || status === "paused";

  const handleSave = async () => {
    if (!isRunning) return;
    setSaving(true);
    try {
      await useEmulatorStore.getState().saveState(activeSlot);
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async () => {
    if (!isRunning) return;
    setLoading(true);
    try {
      await useEmulatorStore.getState().loadState(activeSlot);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Slot selector */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Slot:</span>
        {Array.from({ length: maxSlots }, (_, i) => i + 1).map((slot) => (
          <button
            key={slot}
            onClick={() => setActiveSlot(slot)}
            className={`w-7 h-7 text-xs rounded border transition-colors ${
              activeSlot === slot
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent"
            }`}
          >
            {slot}
          </button>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleSave}
        disabled={!isRunning || saving}
      >
        {saving ? "Saving…" : "Save"}
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={handleLoad}
        disabled={!isRunning || loading}
      >
        {loading ? "Loading…" : "Load"}
      </Button>
    </div>
  );
}
