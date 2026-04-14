import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession, addDevice, getDeviceCount } from "@/db/queries/sessions";
import { db } from "@/db";
import { sessionDevices } from "@/db/schema/sessions";
import { eq, and, isNotNull } from "drizzle-orm";

const MAX_DEVICES = 5;

// POST /api/sessions/[code]/join — join an active session
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = await getSession(params.code);

  if (!session) {
    return NextResponse.json(
      { error: { code: "SESSION_NOT_FOUND", message: "Session not found or expired" } },
      { status: 404 }
    );
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: { code: "SESSION_NOT_FOUND", message: "Session is no longer active" } },
      { status: 404 }
    );
  }

  // Check device count
  const deviceCount = await getDeviceCount(session.id);
  if (deviceCount >= MAX_DEVICES) {
    return NextResponse.json(
      { error: { code: "SESSION_FULL", message: "Session already has the maximum number of devices" } },
      { status: 409 }
    );
  }

  let body: { role?: string } = {};
  try {
    body = await req.json();
  } catch {
    // role defaults to controller
  }

  const role = (body.role as "display" | "controller") ?? "controller";
  const deviceToken = randomUUID();

  // Auto-assign player slot for controller devices (Req 12.2)
  let playerSlot: number | undefined;
  if (role === "controller") {
    // Find used slots for this session
    const existingControllers = await db
      .select({ playerSlot: sessionDevices.playerSlot })
      .from(sessionDevices)
      .where(
        and(
          eq(sessionDevices.sessionId, session.id),
          isNotNull(sessionDevices.playerSlot)
        )
      );

    const usedSlots = new Set(
      existingControllers
        .map((d) => d.playerSlot)
        .filter((s): s is number => s !== null)
    );

    // Assign lowest available slot 1–4
    for (let slot = 1; slot <= 4; slot++) {
      if (!usedSlots.has(slot)) {
        playerSlot = slot;
        break;
      }
    }

    if (playerSlot === undefined) {
      return NextResponse.json(
        { error: { code: "SESSION_FULL", message: "All player slots are occupied" } },
        { status: 409 }
      );
    }
  }

  const device = await addDevice({
    sessionId: session.id,
    deviceToken,
    role,
    playerSlot,
  });

  return NextResponse.json(
    { deviceToken: device.deviceToken, role: device.role, playerSlot: device.playerSlot, sessionId: session.id },
    { status: 201 }
  );
}
