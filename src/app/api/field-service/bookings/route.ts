import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireIdempotencyKey } from '@/lib/api-access';
import { routeError } from '@/lib/route-error';
import { callFieldProvider } from '@/lib/field-service/provider';
import { bookQuote } from '@/lib/field-service/workflow';

export async function POST(request: NextRequest) {
  try {
    const key = requireIdempotencyKey(request.headers);
    const body = await request.json();
    const startTime = new Date(body.startTime);
    if (!body.quoteId || !body.technicianId || Number.isNaN(startTime.getTime())) {
      return NextResponse.json({ error: 'Quote, technician, and a valid startTime are required' }, { status: 400 });
    }
    const quote = await prisma.serviceQuote.findUnique({ where: { id: body.quoteId } });
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    const calendarEvidence = await callFieldProvider('CALENDAR_RESERVE', { sourceRef: quote.quoteNumber, idempotencyKey: `calendar:${key}`, payload: { salonId: quote.salonId, technicianId: body.technicianId, startTime: startTime.toISOString(), durationMinutes: quote.durationMinutes } });
    try {
      const appointment = await bookQuote({ quoteId: quote.id, technicianId: body.technicianId, startTime, idempotencyKey: key, calendarEvidence });
      return NextResponse.json({ appointment }, { status: 201 });
    } catch (bookingError) {
      // The external hold exists before the database transaction. Compensate it
      // deterministically if the authoritative availability/inventory check loses a race.
      try {
        await callFieldProvider('CALENDAR_RELEASE', {
          sourceRef: quote.quoteNumber,
          idempotencyKey: `calendar-compensate:${key}`,
          payload: { reservationEventId: calendarEvidence.eventId, reason: 'BOOKING_NOT_COMMITTED' },
        });
      } catch (compensationError) {
        console.error('Calendar compensation failed', { quoteId: quote.id, key, compensationError });
      }
      throw bookingError;
    }
  } catch (error) {
    return routeError(error);
  }
}
