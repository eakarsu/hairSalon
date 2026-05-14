import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { emitAppointmentEvent } from '@/lib/socket-emitter';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const appointment = await prisma.appointment.findFirst({
      where: { id, salonId: session.user.salonId },
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
    console.error('Appointment fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, startTime, endTime, technicianId } = body;

    const existing = await prisma.appointment.findFirst({
      where: { id, salonId: session.user.salonId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
        ...(technicianId !== undefined && { technicianId }),
      },
      include: {
        client: { select: { name: true, phone: true, preferredLanguage: true } },
        technician: { select: { name: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
    });

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
      session.user.salonId,
      isCancelled ? 'appointment:cancelled' : 'appointment:updated',
      payload
    );

    return NextResponse.json({ appointment: payload });
  } catch (error) {
    console.error('Appointment update error:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.appointment.findFirst({
      where: { id, salonId: session.user.salonId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    await prisma.appointment.delete({ where: { id } });

    emitAppointmentEvent(session.user.salonId, 'appointment:cancelled', { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Appointment delete error:', error);
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
  }
}
