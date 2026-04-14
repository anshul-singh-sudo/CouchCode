/**
 * Keyboard-to-buttonId mapping for desktop play.
 *
 * Button ID Map (matches binary input event format):
 *  0 = D-Pad Up
 *  1 = D-Pad Down
 *  2 = D-Pad Left
 *  3 = D-Pad Right
 *  4 = A
 *  5 = B
 *  6 = X
 *  7 = Y
 *  8 = L
 *  9 = R
 * 10 = Start
 * 11 = Select
 */

export const BUTTON_IDS = {
  DPAD_UP: 0,
  DPAD_DOWN: 1,
  DPAD_LEFT: 2,
  DPAD_RIGHT: 3,
  A: 4,
  B: 5,
  X: 6,
  Y: 7,
  L: 8,
  R: 9,
  START: 10,
  SELECT: 11,
} as const;

export type ButtonId = (typeof BUTTON_IDS)[keyof typeof BUTTON_IDS];

/** Default keyboard mapping for Player 1 (Mode 1 and Mode 2 P1) */
export const DEFAULT_KEYBOARD_MAP: Record<string, ButtonId> = {
  ArrowUp: BUTTON_IDS.DPAD_UP,
  ArrowDown: BUTTON_IDS.DPAD_DOWN,
  ArrowLeft: BUTTON_IDS.DPAD_LEFT,
  ArrowRight: BUTTON_IDS.DPAD_RIGHT,
  z: BUTTON_IDS.A,
  Z: BUTTON_IDS.A,
  x: BUTTON_IDS.B,
  X: BUTTON_IDS.B,
  a: BUTTON_IDS.X,
  A: BUTTON_IDS.X,
  s: BUTTON_IDS.Y,
  S: BUTTON_IDS.Y,
  q: BUTTON_IDS.L,
  Q: BUTTON_IDS.L,
  w: BUTTON_IDS.R,
  W: BUTTON_IDS.R,
  Enter: BUTTON_IDS.START,
  Shift: BUTTON_IDS.SELECT,
  ShiftLeft: BUTTON_IDS.SELECT,
  ShiftRight: BUTTON_IDS.SELECT,
};

/** Mode 2 Player 2 keyboard mapping (WASD + numpad) */
export const MODE2_P2_KEYBOARD_MAP: Record<string, ButtonId> = {
  // D-pad via numpad
  Numpad8: BUTTON_IDS.DPAD_UP,
  Numpad2: BUTTON_IDS.DPAD_DOWN,
  Numpad4: BUTTON_IDS.DPAD_LEFT,
  Numpad6: BUTTON_IDS.DPAD_RIGHT,
  // Action buttons
  Numpad1: BUTTON_IDS.A,
  Numpad3: BUTTON_IDS.B,
  Numpad7: BUTTON_IDS.X,
  Numpad9: BUTTON_IDS.Y,
  NumpadDivide: BUTTON_IDS.L,
  NumpadMultiply: BUTTON_IDS.R,
  NumpadEnter: BUTTON_IDS.START,
  NumpadDecimal: BUTTON_IDS.SELECT,
};

/**
 * Resolve a keyboard event to a buttonId for a given player.
 * Returns undefined if the key is not mapped.
 */
export function resolveKeyToButton(
  key: string,
  code: string,
  playerId: 1 | 2 = 1
): ButtonId | undefined {
  if (playerId === 2) {
    return MODE2_P2_KEYBOARD_MAP[code] ?? MODE2_P2_KEYBOARD_MAP[key];
  }
  return DEFAULT_KEYBOARD_MAP[key] ?? DEFAULT_KEYBOARD_MAP[code];
}
