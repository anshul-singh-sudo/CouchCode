import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { randomUUID } from "crypto";

export interface GuestTokenPayload {
  sub: string;
  exp: number;
  iat: number;
  tier: "free";
}

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  // Use Buffer.from for reliable Uint8Array in all environments (including jsdom)
  return new Uint8Array(Buffer.from(secret, "utf-8"));
}

/**
 * Signs a guest JWT.
 * @param nowSeconds - Unix timestamp in seconds (defaults to Date.now()/1000)
 */
export async function signGuestToken(nowSeconds?: number): Promise<{ token: string; exp: number }> {
  const iat = Math.floor(nowSeconds ?? Date.now() / 1000);
  const exp = iat + 86400;
  const sub = `guest_${randomUUID()}`;

  const token = await new SignJWT({ tier: "free" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(getSecret());

  return { token, exp };
}

export async function verifyGuestToken(token: string): Promise<GuestTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as GuestTokenPayload;
}

/**
 * Decodes a guest token without verifying expiry (for testing purposes).
 */
export function decodeGuestToken(token: string): GuestTokenPayload {
  return decodeJwt(token) as unknown as GuestTokenPayload;
}
