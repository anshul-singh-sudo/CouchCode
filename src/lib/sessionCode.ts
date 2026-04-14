/**
 * Session code generation utilities.
 * Generates 5-character alphanumeric codes using [A-Z0-9] character set.
 * Requirements: 3.1, 3.4
 */

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 5;

/**
 * Generate a single random 5-character session code from [A-Z0-9].
 */
export function generateSessionCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/**
 * Generate a batch of N unique session codes.
 * Guarantees no two codes in the batch are identical.
 */
export function generateUniqueCodes(n: number): string[] {
  const codes = new Set<string>();
  while (codes.size < n) {
    codes.add(generateSessionCode());
  }
  return Array.from(codes);
}
