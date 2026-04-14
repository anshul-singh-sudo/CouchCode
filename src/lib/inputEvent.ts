/**
 * Input Event serialization utilities.
 *
 * Binary format (7 bytes):
 *   Byte 0:   playerId   (uint8, 1–4)
 *   Byte 1:   buttonId   (uint8, 0–11)
 *   Byte 2:   state      (uint8, 0=released, 1=pressed)
 *   Bytes 3–6: timestamp (uint32 little-endian, ms since epoch mod 2^32)
 */

export interface InputEvent {
  playerId: number; // 1–4
  buttonId: number; // 0–11
  state: 0 | 1;    // 0=released, 1=pressed
  timestamp: number; // uint32 (ms since epoch mod 2^32)
}

const EVENT_BYTE_LENGTH = 7;

/**
 * Serialize an InputEvent to a 7-byte Uint8Array.
 */
export function serializeInputEvent(event: InputEvent): Uint8Array {
  const buf = new ArrayBuffer(EVENT_BYTE_LENGTH);
  const view = new DataView(buf);
  view.setUint8(0, event.playerId);
  view.setUint8(1, event.buttonId);
  view.setUint8(2, event.state);
  view.setUint32(3, event.timestamp >>> 0, true); // little-endian, force uint32
  return new Uint8Array(buf);
}

/**
 * Deserialize a 7-byte Uint8Array into an InputEvent.
 * Throws if the buffer is not exactly 7 bytes.
 */
export function deserializeInputEvent(bytes: Uint8Array): InputEvent {
  if (bytes.byteLength !== EVENT_BYTE_LENGTH) {
    throw new Error(
      `Expected ${EVENT_BYTE_LENGTH} bytes, got ${bytes.byteLength}`
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    playerId: view.getUint8(0),
    buttonId: view.getUint8(1),
    state: view.getUint8(2) as 0 | 1,
    timestamp: view.getUint32(3, true), // little-endian
  };
}

/**
 * Validate a 7-byte buffer against the input event allowlist:
 *   byte 0 (playerId) ∈ {1,2,3,4}
 *   byte 1 (buttonId) ∈ {0..11}
 *   byte 2 (state)    ∈ {0,1}
 *
 * Returns true only if all three fields are within valid ranges.
 */
export function validateInputEvent(bytes: Uint8Array): boolean {
  if (bytes.byteLength !== EVENT_BYTE_LENGTH) return false;
  const playerId = bytes[0];
  const buttonId = bytes[1];
  const state = bytes[2];
  return (
    playerId >= 1 && playerId <= 4 &&
    buttonId >= 0 && buttonId <= 11 &&
    (state === 0 || state === 1)
  );
}
