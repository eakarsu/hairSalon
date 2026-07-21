import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfWeek, endOfWeek } from 'date-fns';
import { emitAppointmentEvent } from '@/lib/socket-emitter';
import { requireActiveUser, requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { bookQuote, createQuote } from '@/lib/field-service/workflow';

export async function GET(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER', 'TECHNICIAN', 'FRONTDESK']);

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 0 });

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId: user.salonId,
        startTime: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        client: { select: { name: true, phone: true, preferredLanguage: true } },
        technician: { select: { name: true } },
        service: { select: { name: true, durationMinutes: true } },
        payment: { select: { status: true } },
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
        totalCents: a.totalCents,
        paymentStatus: a.payment?.status || null,
      })),
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireActiveUser(['OWNER', 'MANAGER', 'TECHNICIAN', 'FRONTDESK']);
    const key = requireIdempotencyKey(request.headers);

    const body = await request.json();
    const { clientId, serviceId, technicianId, startTime } = body;

    if (!clientId || !serviceId || !technicianId || !startTime) {
      return NextResponse.json(
        { error: 'Client, service, technician, and start time are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startTime);
    if (Number.isNaN(startDate.getTime())) return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
    const service = await prisma.service.findFirst({ where: { id: serviceId, salonId: user.salonId, active: true } });
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    const sourceRef = `quote:${key}`;
    const taxEvidence = await callFieldProvider('TAX_QUOTE', { sourceRef, idempotencyKey: `tax:${key}`, payload: { salonId: user.salonId, currency: 'USD', lineItems: [{ reference: service.id, description: service.name, quantity: 1, unitPriceCents: Math.round(service.basePrice * 100) }] } });
    const quote = await createQuote({ salonId: user.salonId, clientId, serviceId, technicianId, idempotencyKey: `staff-quote:${key}`, taxEvidence });
    const calendarEvidence = await callFieldProvider('CALENDAR_RESERVE', { sourceRef: quote.quoteNumber, idempotencyKey: `calendar:${key}`, payload: { salonId: user.salonId, technicianId, startTime: startDate.toISOString(), durationMinutes: quote.durationMinutes } });
    const created = await bookQuote({ quoteId: quote.id, technicianId, startTime: startDate, idempotencyKey: key, calendarEvidence, actor: user });
    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        client: { select: { name: true, phone: true, preferredLanguage: true } },
        technician: { select: { name: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
    });

    const appointmentPayload = {
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
    };

    emitAppointmentEvent(user.salonId, 'appointment:created', appointmentPayload);

    return NextResponse.json({ appointment: appointmentPayload }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
