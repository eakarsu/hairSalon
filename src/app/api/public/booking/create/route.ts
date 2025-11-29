import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseISO, addMinutes } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      salonId,
      serviceId,
      technicianId,
      date,
      time,
      clientName,
      clientPhone,
      clientEmail,
      notes,
    } = body;

    // Validate required fields
    if (!salonId || !serviceId || !technicianId || !date || !time || !clientName || !clientPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { durationMinutes: true },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Parse start time
    const [hour, minute] = time.split(':').map(Number);
    const startTime = parseISO(date);
    startTime.setHours(hour, minute, 0, 0);
    const endTime = addMinutes(startTime, service.durationMinutes);

    // Check for conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        technicianId,
        status: { in: ['BOOKED', 'CONFIRMED'] },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json({ error: 'Time slot no longer available' }, { status: 409 });
    }

    // Find or create client
    let client = await prisma.client.findFirst({
      where: {
        salonId,
        phone: clientPhone,
      },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          salonId,
          name: clientName,
          phone: clientPhone,
          email: clientEmail || null,
          marketingOptIn: true,
        },
      });
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        salonId,
        clientId: client.id,
        technicianId,
        serviceId,
        startTime,
        endTime,
        status: 'BOOKED',
        source: 'ONLINE',
        notes: notes || null,
      },
      include: {
        service: { select: { name: true } },
        technician: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        serviceName: appointment.service.name,
        technicianName: appointment.technician.name,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      },
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
