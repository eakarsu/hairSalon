import { NextRequest, NextResponse } from 'next/server';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { cancelAppointment } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { appointment, user, actorRole } = await authorizeAppointment(id, request.headers, { customerAllowed: true, roles: ['OWNER', 'MANAGER', 'FRONTDESK'] });
    const body = await request.json();
    const evidence = await callFieldProvider('CALENDAR_RELEASE', { sourceRef: appointment.appointmentNumber, idempotencyKey: `calendar-release:${key}`, payload: { appointmentId: appointment.id, reason: body.reason } });
    const cancelled = await cancelAppointment({ appointmentId: id, reason: body.reason, idempotencyKey: key, calendarEvidence: evidence, actor: user || undefined, actorRole });
    return NextResponse.json({ appointment: cancelled });
  } catch (error) {
    return routeError(error);
  }
}
