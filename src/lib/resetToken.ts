import { SignJWT, jwtVerify } from "jose";

export interface ResetTokenPayload {
  sub: string; // user id
  email: string;
  exp: number;
  iat: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return new Uint8Array(Buffer.from(secret, "utf-8"));
}

export async function signResetToken(userId: string, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1 hour
    .sign(getSecret());
}

export async function verifyResetToken(token: string): Promise<ResetTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as ResetTokenPayload;
}
