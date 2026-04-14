'use client';

import React, { useCallback, useState } from 'react';
import { serializeInputEvent, type InputEvent } from '@/lib/inputEvent';
import { BUTTON_IDS } from '@/lib/inputMap';

interface VirtualGamepadProps {
  playerId?: 1 | 2 | 3 | 4;
  onInput: (bytes: Uint8Array) => void;
}

interface ButtonConfig {
  id: number;
  label: string;
}

const DPAD_BUTTONS: ButtonConfig[] = [
  { id: BUTTON_IDS.DPAD_UP, label: '▲' },
  { id: BUTTON_IDS.DPAD_DOWN, label: '▼' },
  { id: BUTTON_IDS.DPAD_LEFT, label: '◀' },
  { id: BUTTON_IDS.DPAD_RIGHT, label: '▶' },
];

const ACTION_BUTTONS: ButtonConfig[] = [
  { id: BUTTON_IDS.A, label: 'A' },
  { id: BUTTON_IDS.B, label: 'B' },
  { id: BUTTON_IDS.X, label: 'X' },
  { id: BUTTON_IDS.Y, label: 'Y' },
];

const SHOULDER_BUTTONS: ButtonConfig[] = [
  { id: BUTTON_IDS.L, label: 'L' },
  { id: BUTTON_IDS.R, label: 'R' },
];

const SYSTEM_BUTTONS: ButtonConfig[] = [
  { id: BUTTON_IDS.SELECT, label: 'SELECT' },
  { id: BUTTON_IDS.START, label: 'START' },
];

export function VirtualGamepad({ playerId = 1, onInput }: VirtualGamepadProps) {
  const [pressedButtons, setPressedButtons] = useState<Set<number>>(new Set());

  const emitEvent = useCallback(
    (buttonId: number, state: 0 | 1) => {
      const event: InputEvent = {
        playerId,
        buttonId,
        state,
        timestamp: Date.now() >>> 0,
      };
      onInput(serializeInputEvent(event));
    },
    [playerId, onInput]
  );

  const handleTouchStart = useCallback(
    (buttonId: number) => (e: React.TouchEvent) => {
      e.preventDefault();
      // Iterate all changed touches to support multi-touch
      for (let i = 0; i < e.changedTouches.length; i++) {
        setPressedButtons((prev) => new Set(prev).add(buttonId));
        emitEvent(buttonId, 1);
      }
    },
    [emitEvent]
  );

  const handleTouchEnd = useCallback(
    (buttonId: number) => (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        setPressedButtons((prev) => {
          const next = new Set(prev);
          next.delete(buttonId);
          return next;
        });
        emitEvent(buttonId, 0);
      }
    },
    [emitEvent]
  );

  const buttonStyle = (buttonId: number, base: React.CSSProperties = {}): React.CSSProperties => ({
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    transition: 'transform 80ms ease, opacity 80ms ease',
    transform: pressedButtons.has(buttonId) ? 'scale(0.88)' : 'scale(1)',
    opacity: pressedButtons.has(buttonId) ? 0.65 : 1,
    cursor: 'pointer',
    ...base,
  });

  const renderButton = (btn: ButtonConfig, extraStyle: React.CSSProperties = {}) => (
    <button
      key={btn.id}
      onTouchStart={handleTouchStart(btn.id)}
      onTouchEnd={handleTouchEnd(btn.id)}
      onTouchCancel={handleTouchEnd(btn.id)}
      style={buttonStyle(btn.id, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.3)',
        background: 'rgba(255,255,255,0.15)',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        ...extraStyle,
      })}
      aria-label={btn.label}
    >
      {btn.label}
    </button>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '12px 16px',
        boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.85)',
        touchAction: 'none',
      }}
    >
      {/* Shoulder buttons row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {SHOULDER_BUTTONS.map((btn) =>
          renderButton(btn, { width: 64, height: 36, borderRadius: 8, fontSize: 13 })
        )}
      </div>

      {/* Main controls row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flex: 1,
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        {/* D-Pad */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 48px 48px',
            gridTemplateRows: '48px 48px 48px',
            gap: 2,
          }}
        >
          {/* Up */}
          <div style={{ gridColumn: 2, gridRow: 1 }}>
            {renderButton(DPAD_BUTTONS[0], { width: 48, height: 48, borderRadius: 8 })}
          </div>
          {/* Left */}
          <div style={{ gridColumn: 1, gridRow: 2 }}>
            {renderButton(DPAD_BUTTONS[2], { width: 48, height: 48, borderRadius: 8 })}
          </div>
          {/* Center spacer */}
          <div style={{ gridColumn: 2, gridRow: 2, width: 48, height: 48 }} />
          {/* Right */}
          <div style={{ gridColumn: 3, gridRow: 2 }}>
            {renderButton(DPAD_BUTTONS[3], { width: 48, height: 48, borderRadius: 8 })}
          </div>
          {/* Down */}
          <div style={{ gridColumn: 2, gridRow: 3 }}>
            {renderButton(DPAD_BUTTONS[1], { width: 48, height: 48, borderRadius: 8 })}
          </div>
        </div>

        {/* System buttons (Select / Start) */}
        <div style={{ display: 'flex', gap: 12 }}>
          {SYSTEM_BUTTONS.map((btn) =>
            renderButton(btn, { width: 56, height: 28, borderRadius: 14, fontSize: 10 })
          )}
        </div>

        {/* Action buttons (Y top, X right, B bottom, A left — SNES layout) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 48px 48px',
            gridTemplateRows: '48px 48px 48px',
            gap: 2,
          }}
        >
          {/* Y — top */}
          <div style={{ gridColumn: 2, gridRow: 1 }}>
            {renderButton(ACTION_BUTTONS[3], { width: 48, height: 48 })}
          </div>
          {/* X — left */}
          <div style={{ gridColumn: 1, gridRow: 2 }}>
            {renderButton(ACTION_BUTTONS[2], { width: 48, height: 48 })}
          </div>
          {/* Center spacer */}
          <div style={{ gridColumn: 2, gridRow: 2, width: 48, height: 48 }} />
          {/* A — right */}
          <div style={{ gridColumn: 3, gridRow: 2 }}>
            {renderButton(ACTION_BUTTONS[0], { width: 48, height: 48 })}
          </div>
          {/* B — bottom */}
          <div style={{ gridColumn: 2, gridRow: 3 }}>
            {renderButton(ACTION_BUTTONS[1], { width: 48, height: 48 })}
          </div>
        </div>
      </div>
    </div>
  );
}
