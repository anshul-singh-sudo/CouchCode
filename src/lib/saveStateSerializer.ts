/**
 * Save State Serialization Utilities
 *
 * Provides serialize/deserialize functions for emulator save state blobs.
 * A small header is prepended to make the format non-trivial and verifiable:
 *
 *   Bytes 0–3:  Magic bytes  [0xCC, 0x53, 0x53, 0x01]  ("CSS\x01")
 *   Bytes 4–7:  Payload length as uint32 little-endian
 *   Bytes 8+:   Raw state payload
 *
 * Validates: Requirements 1.10, 2.1, 2.3
 */

const MAGIC = new Uint8Array([0xcc, 0x53, 0x53, 0x01]);
const HEADER_SIZE = 8; // 4 magic + 4 length

/**
 * Serialize a raw emulator state blob by prepending a header.
 */
export function serialize(state: Uint8Array): Uint8Array {
  const out = new Uint8Array(HEADER_SIZE + state.length);

  // Write magic bytes
  out.set(MAGIC, 0);

  // Write payload length as uint32 LE
  const view = new DataView(out.buffer);
  view.setUint32(4, state.length, /* littleEndian */ true);

  // Write payload
  out.set(state, HEADER_SIZE);

  return out;
}

/**
 * Deserialize a serialized save state blob, stripping the header.
 * Throws if the magic bytes are invalid or the length field is inconsistent.
 */
export function deserialize(data: Uint8Array): Uint8Array {
  if (data.length < HEADER_SIZE) {
    throw new Error(
      `Invalid save state: too short (${data.length} bytes, need at least ${HEADER_SIZE})`
    );
  }

  // Validate magic bytes
  for (let i = 0; i < MAGIC.length; i++) {
    if (data[i] !== MAGIC[i]) {
      throw new Error(
        `Invalid save state: bad magic byte at index ${i} (got 0x${data[i].toString(16)}, expected 0x${MAGIC[i].toString(16)})`
      );
    }
  }

  // Read payload length
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const payloadLength = view.getUint32(4, /* littleEndian */ true);

  if (data.length !== HEADER_SIZE + payloadLength) {
    throw new Error(
      `Invalid save state: length mismatch (header says ${payloadLength}, actual ${data.length - HEADER_SIZE})`
    );
  }

  return data.slice(HEADER_SIZE);
}
