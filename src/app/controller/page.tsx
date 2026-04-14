'use client';

import { useEffect, useState } from 'react';
import { VirtualGamepad } from '@/components/gamepad/VirtualGamepad';
import { useSessionStore } from '@/stores/sessionStore';
import { deserializeInputEvent } from '@/lib/inputEvent';

export default function ControllerPage() {
  const { sessionCode, sendInput } = useSessionStore();
  const [isTouchDevice, setIsTouchDevice] = useState<boolean | null>(null);

  // Detect touch capability after mount (avoids SSR mismatch)
  useEffect(() => {
    setIsTouchDevice(
      'ontouchstart' in window || navigator.maxTouchPoints > 0
    );
  }, []);

  const handleInput = (bytes: Uint8Array) => {
    const event = deserializeInputEvent(bytes);
    sendInput(event);
  };

  // Still detecting
  if (isTouchDevice === null) return null;

  // Desktop fallback
  if (!isTouchDevice) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111',
          color: '#fff',
          gap: 12,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600 }}>
          Use keyboard on desktop
        </p>
        <p style={{ fontSize: 14, color: '#aaa' }}>
          The virtual gamepad is designed for touch-enabled devices.
          Open this page on your phone or tablet to use it as a controller.
        </p>
        {sessionCode && (
          <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
            Session: <strong style={{ color: '#fff' }}>{sessionCode}</strong>
          </p>
        )}
      </div>
    );
  }

  // Determine player slot from session store (assigned by server on join)
  const connectedDevices = useSessionStore((s) => s.connectedDevices);
  const deviceToken = useSessionStore((s) => s._deviceToken);
  const myDevice = connectedDevices.find((d) => d.token === deviceToken);
  const playerSlot = (myDevice?.playerSlot ?? 1) as 1 | 2 | 3 | 4;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#111',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.6)',
          flexShrink: 0,
        }}
      >
        {/* Player slot badge */}
        <span
          style={{
            background: '#6366f1',
            color: '#fff',
            borderRadius: 6,
            padding: '2px 10px',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          P{playerSlot}
        </span>

        {/* Session code */}
        {sessionCode ? (
          <span style={{ color: '#aaa', fontSize: 12 }}>
            Session:{' '}
            <strong style={{ color: '#fff', letterSpacing: 2 }}>
              {sessionCode}
            </strong>
          </span>
        ) : (
          <span style={{ color: '#555', fontSize: 12 }}>No session</span>
        )}
      </div>

      {/* Gamepad fills remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <VirtualGamepad playerId={playerSlot} onInput={handleInput} />
      </div>
    </div>
  );
}
