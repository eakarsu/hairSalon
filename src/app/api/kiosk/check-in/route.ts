import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

// Search for client's appointments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const phone = searchParams.get('phone');

    if (!salonId || !phone) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

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
    console.error('Check-in search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const appointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
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
    console.error('Check-in confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
