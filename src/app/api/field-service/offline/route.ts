import { NextRequest, NextResponse } from 'next/server';
import type { AppointmentStatus } from '@prisma/client';
import { requireActiveUser } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { applyOfflineCommand } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER', 'TECHNICIAN', 'FRONTDESK']);
    const body = await request.json();
    const command = await applyOfflineCommand({ salonId: user.salonId, appointmentId: body.appointmentId, deviceId: body.deviceId, commandId: body.commandId, expectedVersion: body.expectedVersion, toStatus: body.toStatus as AppointmentStatus, note: body.note, actor: user });
    return NextResponse.json({ command });
  } catch (error) {
    return routeError(error);
  }
}
