import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { startOfWeek, endOfWeek, addMinutes } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 0 });

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: session.user.salonId,
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        client: { select: { name: true, phone: true, preferredLanguage: true } },
        technician: { select: { name: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        clientId: a.clientId,
        clientName: a.client.name,
        clientPhone: a.client.phone,
        clientLanguage: a.client.preferredLanguage,
        technicianId: a.technicianId,
        technicianName: a.technician.name,
        serviceId: a.serviceId,
        serviceName: a.service.name,
        serviceDuration: a.service.durationMinutes,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        status: a.status,
        source: a.source,
        notes: a.notes,
      })),
    });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, serviceId, technicianId, startTime, duration, notes, source } = body;

    if (!clientId || !serviceId || !technicianId || !startTime) {
      return NextResponse.json(
        { error: 'Client, service, technician, and start time are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startTime);
    const endDate = addMinutes(startDate, duration || 60);

    const appointment = await prisma.appointment.create({
      data: {
        salonId: session.user.salonId,
        clientId,
        serviceId,
        technicianId,
        startTime: startDate,
        endTime: endDate,
        status: 'BOOKED',
        source: source || 'WALKIN',
        notes: notes || null,
      },
      include: {
        client: { select: { name: true, phone: true, preferredLanguage: true } },
        technician: { select: { name: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
    });

    return NextResponse.json({
      appointment: {
        id: appointment.id,
        clientId: appointment.clientId,
        clientName: appointment.client.name,
        clientPhone: appointment.client.phone,
        clientLanguage: appointment.client.preferredLanguage,
        technicianId: appointment.technicianId,
        technicianName: appointment.technician.name,
        serviceId: appointment.serviceId,
        serviceName: appointment.service.name,
        serviceDuration: appointment.service.durationMinutes,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        status: appointment.status,
        source: appointment.source,
        notes: appointment.notes,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Appointment create error:', error);
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
