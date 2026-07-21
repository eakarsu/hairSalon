import { NextRequest, NextResponse } from 'next/server';
import type { AppointmentStatus } from '@prisma/client';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { recordPartialWork, transitionAppointment } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { user } = await authorizeAppointment(id, request.headers, { roles: ['OWNER', 'MANAGER', 'TECHNICIAN', 'FRONTDESK'] });
    const body = await request.json();
    if (body.toStatus === 'PARTIALLY_COMPLETED') {
      const appointment = await recordPartialWork({ appointmentId: id, quantity: body.quantity, notes: body.notes, idempotencyKey: key, actor: user! });
      return NextResponse.json({ appointment });
    }
    const appointment = await transitionAppointment({ appointmentId: id, toStatus: body.toStatus as AppointmentStatus, expectedVersion: body.expectedVersion, note: body.note, idempotencyKey: key, actor: user! });
    return NextResponse.json({ appointment });
  } catch (error) {
    return routeError(error);
  }
}
