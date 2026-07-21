import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { emitAppointmentEvent } from '@/lib/socket-emitter';
import { authorizeAppointment, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { cancelAppointment, reassignTechnician, rescheduleAppointment, transitionAppointment } from '@/lib/field-service/workflow';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { appointment: scoped } = await authorizeAppointment(id, _request.headers, { roles: ['OWNER', 'MANAGER', 'TECHNICIAN', 'FRONTDESK'] });
    const appointment = await prisma.appointment.findFirst({
      where: { id, salonId: scoped.salonId },
      include: {
        client: { select: { name: true, phone: true, preferredLanguage: true } },
        technician: { select: { name: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const key = requireIdempotencyKey(request.headers);
    const { appointment: existing, user } = await authorizeAppointment(id, request.headers, { roles: ['OWNER', 'MANAGER', 'TECHNICIAN', 'FRONTDESK'] });
    const body = await request.json();
    const { status, notes, startTime, endTime, technicianId } = body;
    let changed;
    if (status === 'CANCELLED') {
      const evidence = await callFieldProvider('CALENDAR_RELEASE', { sourceRef: existing.appointmentNumber, idempotencyKey: `calendar-release:${key}`, payload: { appointmentId: id, reason: notes } });
      changed = await cancelAppointment({ appointmentId: id, reason: notes, idempotencyKey: key, calendarEvidence: evidence, actor: user! });
    } else if (startTime || endTime) {
      const nextStart = new Date(startTime || existing.startTime);
      const nextEnd = new Date(endTime || new Date(nextStart.getTime() + (existing.endTime.getTime() - existing.startTime.getTime())));
      const releaseEvidence = await callFieldProvider('CALENDAR_RELEASE', { sourceRef: existing.appointmentNumber, idempotencyKey: `reschedule-release:${key}`, payload: { appointmentId: id, previousStartTime: existing.startTime } });
      const reserveEvidence = await callFieldProvider('CALENDAR_RESERVE', { sourceRef: existing.appointmentNumber, idempotencyKey: `reschedule-reserve:${key}`, payload: { appointmentId: id, technicianId: technicianId || existing.technicianId, startTime: nextStart, endTime: nextEnd } });
      changed = await rescheduleAppointment({ appointmentId: id, technicianId, startTime: nextStart, endTime: nextEnd, releaseEvidence, reserveEvidence, actor: user!, idempotencyKey: key });
    } else if (technicianId) {
      changed = await reassignTechnician({ appointmentId: id, technicianId, actor: user!, idempotencyKey: key });
    } else if (status) {
      changed = await transitionAppointment({ appointmentId: id, toStatus: status, note: notes, actor: user!, idempotencyKey: key, expectedVersion: body.expectedVersion });
    } else {
      return NextResponse.json({ error: 'Use a lifecycle status, reassignment, or reschedule operation' }, { status: 400 });
    }
    const updated = await prisma.appointment.findUniqueOrThrow({ where: { id: changed.id }, include: { client: { select: { name: true, phone: true, preferredLanguage: true } }, technician: { select: { name: true } }, service: { select: { name: true, durationMinutes: true } } } });

    const payload = {
      id: updated.id,
      clientId: updated.clientId,
      clientName: updated.client.name,
      technicianId: updated.technicianId,
      technicianName: updated.technician.name,
      serviceId: updated.serviceId,
      serviceName: updated.service.name,
      startTime: updated.startTime.toISOString(),
      endTime: updated.endTime.toISOString(),
      status: updated.status,
      notes: updated.notes,
    };

    const isCancelled = updated.status === 'CANCELLED';
    emitAppointmentEvent(
      existing.salonId,
      isCancelled ? 'appointment:cancelled' : 'appointment:updated',
      payload
    );

    return NextResponse.json({ appointment: payload });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Appointments are immutable; use the cancellation lifecycle' }, { status: 405 });
}
