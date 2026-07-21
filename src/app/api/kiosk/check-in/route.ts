import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';
import { requireIdempotencyKey, requireKiosk } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { transitionAppointment } from '@/lib/field-service/workflow';

// Search for client's appointments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const phone = searchParams.get('phone');

    if (!salonId || !phone) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    await requireKiosk(request.headers, salonId);

    const today = new Date();

    // Find client by phone
    const client = await prisma.client.findFirst({
      where: {
        salonId,
        phone: { contains: phone.replace(/\D/g, '') },
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (!client) {
      return NextResponse.json({ client: null, appointments: [] });
    }

    // Find today's appointments for this client
    const appointments = await prisma.appointment.findMany({
      where: {
        clientId: client.id,
        startTime: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        status: { in: ['BOOKED', 'CONFIRMED'] },
      },
      include: {
        service: { select: { name: true } },
        technician: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({
      client,
      appointments: appointments.map((apt) => ({
        id: apt.id,
        serviceName: apt.service.name,
        technicianName: apt.technician.name,
        startTime: apt.startTime,
        status: apt.status,
      })),
    });
  } catch (error) {
    return routeError(error);
  }
}

// Confirm check-in for an appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
    }

    const existing = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!existing) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    const device = await requireKiosk(request.headers, existing.salonId);
    const key = requireIdempotencyKey(request.headers);
    await transitionAppointment({ appointmentId, toStatus: 'CONFIRMED', idempotencyKey: key, actorRole: `KIOSK:${device.id}` });
    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointmentId },
      include: {
        service: { select: { name: true } },
        technician: { select: { name: true } },
        client: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        clientName: appointment.client.name,
        serviceName: appointment.service.name,
        technicianName: appointment.technician.name,
        startTime: appointment.startTime,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
